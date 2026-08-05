import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) } },
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

// The copy comes from `site_pages`; the defaults are enough for these tests.
vi.mock("@/hooks/useHomeContent", async () => {
  const { HOME_DEFAULTS } = await import("@/lib/homeContent");
  return { useHomeContent: () => HOME_DEFAULTS };
});

import NewsletterCta from "@/components/site/NewsletterCta";

const emailField = () => screen.getByLabelText(/e-mail/i);
const subscribe = () => screen.getByRole("button", { name: /subscribe/i });

beforeEach(() => {
  invoke.mockReset();
  toast.mockReset();
});

describe("NewsletterCta", () => {
  it("sends the sign-up to the edge function", async () => {
    invoke.mockResolvedValue({ data: { ok: true, subscribed: true }, error: null });
    const user = userEvent.setup();
    render(<NewsletterCta />);

    await user.type(emailField(), "dani@example.com");
    await user.type(screen.getByLabelText(/^name$/i), "Dani");
    await user.click(subscribe());

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("newsletter-subscribe");
    expect(opts.body).toMatchObject({ email: "dani@example.com", name: "Dani" });
  });

  it("asks for nothing beyond a name and an email", () => {
    const { container } = render(<NewsletterCta />);
    const visible = [...container.querySelectorAll("input")].filter(
      (i) => i.getAttribute("aria-hidden") !== "true",
    );
    expect(visible.map((i) => i.id)).toEqual(["newsletter-name", "newsletter-email"]);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.queryByText(/interested in/i)).not.toBeInTheDocument();
  });

  it("confirms only after the backend accepted", async () => {
    invoke.mockResolvedValue({ data: { ok: true, subscribed: true }, error: null });
    const user = userEvent.setup();
    render(<NewsletterCta />);

    await user.type(emailField(), "dani@example.com");
    await user.click(subscribe());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "You're on the list." }),
      ),
    );
    expect(emailField()).toHaveValue("");
  });

  // The whole point of the rewrite: the old form waited 350ms and claimed
  // success no matter what, silently dropping the address.
  it("reports a failure instead of faking success", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    const user = userEvent.setup();
    render(<NewsletterCta />);

    await user.type(emailField(), "dani@example.com");
    await user.click(subscribe());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      ),
    );
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "You're on the list." }),
    );
    // What they typed survives, so retrying is one click.
    expect(emailField()).toHaveValue("dani@example.com");
  });

  it("treats a non-ok response body as a failure", async () => {
    invoke.mockResolvedValue({ data: { error: "Please enter a valid email address." }, error: null });
    const user = userEvent.setup();
    render(<NewsletterCta />);

    await user.type(emailField(), "nope@example.com");
    await user.click(subscribe());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })),
    );
  });

  it("does not submit an empty address", async () => {
    const user = userEvent.setup();
    render(<NewsletterCta />);
    await user.click(subscribe());
    expect(invoke).not.toHaveBeenCalled();
  });
});
