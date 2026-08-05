import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The copy comes from `site_pages`; the defaults are enough for these tests.
vi.mock("@/hooks/useHomeContent", async () => {
  const { HOME_DEFAULTS } = await import("@/lib/homeContent");
  return { useHomeContent: () => HOME_DEFAULTS };
});

import NewsletterCta from "@/components/site/NewsletterCta";

const cta = () => screen.getByRole("link", { name: /subscribe on substack/i });

describe("NewsletterCta", () => {
  it("sends readers to the Siana Architecture publication", () => {
    render(<NewsletterCta />);
    expect(cta()).toHaveAttribute(
      "href",
      "https://sianaarchitecture.substack.com/?r=8l6ahp&utm_campaign=pub-share-checklist",
    );
  });

  it("opens in a new tab so the reader keeps their place on the site", () => {
    render(<NewsletterCta />);
    expect(cta()).toHaveAttribute("target", "_blank");
  });

  // Without `noopener` the opened page can reach back via window.opener.
  it("does not hand window.opener to the opened page", () => {
    render(<NewsletterCta />);
    expect(cta().getAttribute("rel")).toContain("noopener");
  });

  // Collecting an address here and then sending the reader elsewhere to enter
  // it again would be worse than either option on its own.
  it("collects nothing itself", () => {
    const { container } = render(<NewsletterCta />);
    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(container.querySelectorAll("form")).toHaveLength(0);
  });

  it("still shows the editorial intro copy", () => {
    render(<NewsletterCta />);
    expect(screen.getByText(/stay in touch/i)).toBeInTheDocument();
  });
});
