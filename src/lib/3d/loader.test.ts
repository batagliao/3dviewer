import { describe, it, expect } from "vitest";
import { adapterForExtension } from "./loader";
import { formatBytes } from "./metrics";

describe("loader factory", () => {
  it("resolves adapters per extension", () => {
    expect(adapterForExtension("stl")).toBeTruthy();
    expect(adapterForExtension(".OBJ")).toBeTruthy();
    expect(adapterForExtension("3mf")).toBeTruthy();
    expect(() => adapterForExtension("txt")).toThrow();
  });
});

describe("formatBytes", () => {
  it("formats", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
  });
});
