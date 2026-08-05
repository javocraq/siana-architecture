import { describe, expect, it } from "vitest";
import { parseTsv, tsvToGrid } from "@/lib/tsvTable";

describe("parseTsv", () => {
  it("splits a plain grid", () => {
    expect(parseTsv("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles CRLF records without emitting blank rows", () => {
    expect(parseTsv("a\tb\r\nc\td\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps quoted fields that contain tabs and newlines intact", () => {
    expect(parseTsv('a\t"b\tstill b"\nc\t"line 1\nline 2"')).toEqual([
      ["a", "b\tstill b"],
      ["c", "line 1\nline 2"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseTsv('"say ""hi"""\tb')).toEqual([['say "hi"', "b"]]);
  });
});

describe("tsvToGrid", () => {
  it("builds a rectangular grid from spreadsheet cells", () => {
    expect(tsvToGrid("City\tArchitect\tYear\nBarcelona\tGaudí\t1926")).toEqual({
      cols: 3,
      rows: [
        ["City", "Architect", "Year"],
        ["Barcelona", "Gaudí", "1926"],
      ],
    });
  });

  it("pads short rows out to the widest one", () => {
    expect(tsvToGrid("a\tb\tc\nd\te")?.rows).toEqual([
      ["a", "b", "c"],
      ["d", "e", ""],
    ]);
  });

  it("ignores text with no tabs", () => {
    expect(tsvToGrid("just a sentence\nand another")).toBeNull();
  });

  it("ignores prose that merely contains a stray tab", () => {
    expect(tsvToGrid("a line with\ta tab\nbut this one has none")).toBeNull();
  });

  it("needs at least two rows", () => {
    expect(tsvToGrid("only\tone\trow")).toBeNull();
  });

  it("needs at least two columns", () => {
    expect(tsvToGrid("one\n\ntwo\n")).toBeNull();
  });

  it("drops fully blank rows left by a trailing newline", () => {
    expect(tsvToGrid("a\tb\nc\td\n\n")?.rows).toHaveLength(2);
  });
});
