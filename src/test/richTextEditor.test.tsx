import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

// Supabase is only reached for the map picker's city/project list.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: async () =>
          table === "cities"
            ? { data: [{ name: "Barcelona", slug: "barcelona" }] }
            : { data: [{ name: "Sagrada Família", slug: "sagrada-familia" }] },
      }),
    }),
  },
}));

const uploadImage = vi.fn(async () => "https://cdn.test/photo.jpg");
vi.mock("@/lib/uploadImage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/uploadImage")>()),
  uploadImage: (...args: unknown[]) => uploadImage(...(args as [])),
}));

import RichTextEditor from "@/components/admin/RichTextEditor";

/** Mirrors how the admin pages drive the editor: controlled value + onChange. */
function Harness({ onHtml }: { onHtml: (html: string) => void }) {
  const [value, setValue] = useState("<p>Start</p>");
  return (
    <RichTextEditor
      value={value}
      onChange={(html) => {
        setValue(html);
        onHtml(html);
      }}
    />
  );
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  uploadImage.mockClear();
});

describe("RichTextEditor", () => {
  it("offers uploading from the computer alongside the URL option", async () => {
    render(<Harness onHtml={() => {}} />);
    expect(
      await screen.findByTitle("Upload image from your computer"),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Insert image from a URL")).toBeInTheDocument();
    expect(screen.getByTitle("Insert map")).toBeInTheDocument();
  });

  it("uploads a picked file and inserts it into the document", async () => {
    let html = "";
    const { container } = render(<Harness onHtml={(h) => (html = h)} />);
    await screen.findByTitle("Upload image from your computer");

    const file = new File(["binary"], "Casa Mila.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(html).toContain('src="https://cdn.test/photo.jpg"'));
    // The filename becomes usable alt text rather than being thrown away.
    expect(html).toContain('alt="Casa Mila"');
  });

  it("surfaces an upload failure instead of failing silently", async () => {
    uploadImage.mockRejectedValueOnce(new Error("File too large"));
    const { container } = render(<Harness onHtml={() => {}} />);
    await screen.findByTitle("Upload image from your computer");

    fireEvent.change(fileInput(container), {
      target: { files: [new File([""], "huge.png", { type: "image/png" })] },
    });

    expect(await screen.findByText("File too large")).toBeInTheDocument();
  });

  it("turns pasted spreadsheet cells into a real table", async () => {
    let html = "";
    const { container } = render(<Harness onHtml={(h) => (html = h)} />);
    await screen.findByTitle("Upload image from your computer");

    const prose = container.querySelector(".ProseMirror") as HTMLElement;
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: {
        files: [],
        items: [],
        getData: (type: string) =>
          type === "text/plain" ? "City\tArchitect\nBarcelona\tGaudí" : "",
      },
    });
    prose.dispatchEvent(paste);

    await waitFor(() => expect(html).toContain("<table"));
    expect(html).toContain("Barcelona");
    expect(html).toContain("Gaudí");
    // First row becomes the header.
    expect(html).toContain("<th");
  });

  it("leaves ordinary prose alone when it merely contains a tab", async () => {
    let html = "";
    const { container } = render(<Harness onHtml={(h) => (html = h)} />);
    await screen.findByTitle("Upload image from your computer");

    const prose = container.querySelector(".ProseMirror") as HTMLElement;
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: {
        files: [],
        items: [],
        getData: (type: string) =>
          type === "text/plain" ? "a sentence with\ta tab in it" : "",
      },
    });
    prose.dispatchEvent(paste);

    // Give any async handler a chance to run before asserting nothing happened.
    await new Promise((r) => setTimeout(r, 0));
    expect(html).not.toContain("<table");
  });

  it("inserts a map block pinned to the chosen city", async () => {
    const user = userEvent.setup();
    let html = "";
    render(<Harness onHtml={(h) => (html = h)} />);

    await user.click(await screen.findByTitle("Insert map"));
    await user.click(await screen.findByText("Barcelona"));

    await waitFor(() => expect(html).toContain('data-map-embed="city"'));
    expect(html).toContain('data-slug="barcelona"');
    expect(html).toContain('data-label="Barcelona"');
  });

  it("can pin a map to a single project", async () => {
    const user = userEvent.setup();
    let html = "";
    render(<Harness onHtml={(h) => (html = h)} />);

    await user.click(await screen.findByTitle("Insert map"));
    await user.type(screen.getByPlaceholderText("Search cities and projects"), "Sagrada");
    await user.click(await screen.findByText("Sagrada Família"));

    await waitFor(() => expect(html).toContain('data-map-embed="project"'));
    expect(html).toContain('data-slug="sagrada-familia"');
  });
});
