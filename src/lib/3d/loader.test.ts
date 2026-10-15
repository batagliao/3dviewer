import { describe, it, expect } from "vitest";
import { adapterForExtension, StlAdapter } from "./loader";
import { centerPositions, formatBytes } from "./metrics";

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

describe("origin normalization", () => {
  it("centers a bbox on the origin and reports the offset", () => {
    const pos = new Float32Array([100, 0, 0, 110, 0, 0, 100, 10, 0]);
    const offset = centerPositions(pos);
    expect(offset).toEqual([105, 5, 0]);
    expect(Array.from(pos)).toEqual([-5, -5, 0, 5, -5, 0, -5, 5, 0]);
  });

  it("centers STL geometry far from the origin", async () => {
    // One binary STL triangle offset at x=1000.
    const buf = new ArrayBuffer(84 + 50);
    const dv = new DataView(buf);
    dv.setUint32(80, 1, true);
    const verts = [1000, 200, 300, 1010, 200, 300, 1000, 210, 300];
    let o = 84 + 12; // skip normal
    for (const v of verts) {
      dv.setFloat32(o, v, true);
      o += 4;
    }
    const data = await new StlAdapter().load(new Uint8Array(buf));
    // Bbox symmetric about the origin on every axis.
    expect(data.bboxMin[0]).toBeCloseTo(-5, 5);
    expect(data.bboxMax[0]).toBeCloseTo(5, 5);
    expect(data.bboxMin[1]).toBeCloseTo(-5, 5);
    expect(data.bboxMax[1]).toBeCloseTo(5, 5);
    expect(data.bboxMin[2]).toBeCloseTo(0, 5);
    expect(data.bboxMax[2]).toBeCloseTo(0, 5);
    expect(Array.from(data.positions).map((v) => Math.round(v))).toEqual([
      -5, -5, 0, 5, -5, 0, -5, 5, 0
    ]);
  });
});
