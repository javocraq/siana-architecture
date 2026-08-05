import { describe, expect, it } from "vitest";
import DOMPurify from "dompurify";
import { MAP_EMBED_SELECTOR, isMapEmbedKind, readMapEmbed } from "@/lib/mapEmbed";

function el(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe("isMapEmbedKind", () => {
  it("accepts the two supported kinds", () => {
    expect(isMapEmbedKind("city")).toBe(true);
    expect(isMapEmbedKind("project")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isMapEmbedKind("note")).toBe(false);
    expect(isMapEmbedKind(null)).toBe(false);
    expect(isMapEmbedKind(undefined)).toBe(false);
  });
});

describe("readMapEmbed", () => {
  it("reads a city embed", () => {
    expect(readMapEmbed(el('<div data-map-embed="city" data-slug="barcelona"></div>'))).toEqual({
      kind: "city",
      slug: "barcelona",
      label: undefined,
    });
  });

  it("carries the label through when the editor stored one", () => {
    const node = el('<div data-map-embed="project" data-slug="sagrada-familia" data-label="Sagrada Família"></div>');
    expect(readMapEmbed(node)).toEqual({
      kind: "project",
      slug: "sagrada-familia",
      label: "Sagrada Família",
    });
  });

  it("ignores a placeholder with no target", () => {
    expect(readMapEmbed(el('<div data-map-embed="city" data-slug="  "></div>'))).toBeNull();
    expect(readMapEmbed(el('<div data-map-embed="city"></div>'))).toBeNull();
  });

  it("ignores an unknown kind", () => {
    expect(readMapEmbed(el('<div data-map-embed="galaxy" data-slug="x"></div>'))).toBeNull();
  });
});

describe("sanitising editor content", () => {
  // RichHtml runs every stored body through DOMPurify. If that stripped the
  // data attributes, every embedded map would silently vanish on the site.
  const sanitize = (html: string) =>
    DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "data-map-embed", "data-slug", "data-label"],
    });

  it("keeps map placeholders intact", () => {
    const clean = sanitize(
      '<p>Before</p><div data-map-embed="city" data-slug="barcelona" data-label="Barcelona"></div><p>After</p>',
    );
    const host = document.createElement("div");
    host.innerHTML = clean;
    const found = host.querySelector<HTMLElement>(MAP_EMBED_SELECTOR);
    expect(found).not.toBeNull();
    expect(readMapEmbed(found!)).toEqual({
      kind: "city",
      slug: "barcelona",
      label: "Barcelona",
    });
  });

  it("still strips scripts and inline handlers", () => {
    const clean = sanitize('<div data-map-embed="city" data-slug="x" onclick="steal()"></div><script>bad()</script>');
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain('data-map-embed="city"');
  });
});
