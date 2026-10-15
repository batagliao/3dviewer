import { describe, it, expect } from "vitest";
import { zipSync } from "fflate";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { Mf3Adapter, parse3mfGeometryFallback } from "./loader";

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

const MESH = `
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="10" y="0" z="0"/>
          <vertex x="0" y="10" z="0"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
        </triangles>
      </mesh>`;

function modelXml(objects: string, buildId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>${objects}
  </resources>
  <build>
    <item objectid="${buildId}"/>
  </build>
</model>`;
}

function make3mf(objects: string, buildId: string): Uint8Array {
  return zipSync({
    "3D/3dmodel.model": new TextEncoder().encode(modelXml(objects, buildId)),
    "_rels/.rels": new TextEncoder().encode(RELS)
  });
}

const SIMPLE = `    <object id="1" type="model">${MESH}
    </object>`;

/** Assembly whose component references a non-existent object: the reported crash. */
const DANGLING_COMPONENT = `${SIMPLE}
    <object id="2" type="model">
      <components>
        <component objectid="999"/>
      </components>
    </object>`;

describe("3mf loading", () => {
  it("loads a valid 3mf", async () => {
    const data = await new Mf3Adapter().load(make3mf(SIMPLE, "1"));
    expect(data.triangleCount).toBe(1);
    expect(data.vertexCount).toBe(3);
    expect(data.bboxMax).toEqual([10, 10, 0]);
  });

  it("raw ThreeMFLoader throws on the dangling component (reported crash)", () => {
    const bytes = make3mf(DANGLING_COMPONENT, "2");
    expect(() =>
      new ThreeMFLoader().parse(bytes.buffer.slice(0) as ArrayBuffer)
    ).toThrow(TypeError);
  });

  it("falls back to geometry preview on the dangling component", async () => {
    const data = await new Mf3Adapter().load(make3mf(DANGLING_COMPONENT, "2"));
    expect(data.triangleCount).toBe(1);
    expect(data.sourceFormat).toBe("3mf");
  });

  it("fallback parses geometry directly", () => {
    const data = parse3mfGeometryFallback(make3mf(DANGLING_COMPONENT, "2"));
    expect(data.triangleCount).toBe(1);
    expect(Array.from(data.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 10, 0]);
  });

  it("rejects garbage with a clean error", async () => {
    await expect(
      new Mf3Adapter().load(new Uint8Array([1, 2, 3, 4]))
    ).rejects.toThrow();
  });
});
