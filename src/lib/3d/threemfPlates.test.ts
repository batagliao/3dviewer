import { describe, it, expect } from "vitest";
import { zipSync } from "fflate";
import { Mf3Adapter } from "./loader";
import { parse3mfProject } from "./threemfProject";

const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const PROD = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

// Bambu-style root: assemblies referencing per-object files via p:path.
const ROOT = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="${CORE}" xmlns:p="${PROD}">
  <resources>
    <object id="1" type="model">
      <components>
        <component objectid="10" p:path="/3D/Objects/object_1.model"/>
      </components>
    </object>
    <object id="2" type="model">
      <components>
        <component objectid="20" p:path="/3D/Objects/object_2.model"/>
      </components>
    </object>
  </resources>
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 256 0 0"/>
  </build>
</model>`;

function nestedModel(id: string, z: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="${CORE}">
  <resources>
    <object id="${id}" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="${z}"/>
          <vertex x="10" y="0" z="${z}"/>
          <vertex x="0" y="10" z="${z}"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build/>
</model>`;
}

const SETTINGS = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Bench"/>
    <model_instance>
      <metadata key="object_id" value="1"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="7"/>
    </model_instance>
  </plate>
  <plate>
    <metadata key="plater_id" value="2"/>
    <metadata key="plater_name" value=""/>
    <model_instance>
      <metadata key="object_id" value="2"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="9"/>
    </model_instance>
  </plate>
  <assemble>
    <assemble_item object_id="1" instance_id="0" transform="1 0 0 0 1 0 0 0 1 0 0 0" offset="0 0 0"/>
    <assemble_item object_id="2" instance_id="0" transform="1 0 0 0 1 0 0 0 1 256 0 0" offset="0 0 0"/>
  </assemble>
</config>`;

const enc = (s: string) => new TextEncoder().encode(s);

function bambuBytes(withPlates: boolean): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "3D/3dmodel.model": enc(ROOT),
    "3D/Objects/object_1.model": enc(nestedModel("10", "0")),
    "3D/Objects/object_2.model": enc(nestedModel("20", "5")),
    "_rels/.rels": enc(RELS)
  };
  if (withPlates) files["Metadata/model_settings.config"] = enc(SETTINGS);
  return zipSync(files);
}

describe("bambu-style 3mf projects", () => {
  it("parses plates, names, transforms and nested parts", () => {
    const data = parse3mfProject(bambuBytes(true));
    expect(data.plates?.length).toBe(2);
    expect(data.plates!.map((p) => p.name)).toEqual(["Bench", "Plate 2"]);
    expect(data.triangleCount).toBe(2);

    const [p1, p2] = data.plates!;
    expect(p1.triangleCount).toBe(1);
    // Each plate is centered on the origin (translation only), so both
    // plates share the same local coords despite the +256x assemble offset.
    expect(Array.from(p1.positions)).toEqual([-5, -5, 0, 5, -5, 0, -5, 5, 0]);
    // plate 2 geometry: z=5 mesh shifted +256 on x by assemble transform,
    // then re-centered to the origin for display.
    expect(p2.triangleCount).toBe(1);
    expect(Array.from(p2.positions)).toEqual([-5, -5, 0, 5, -5, 0, -5, 5, 0]);
  });

  it("adapter resolves the full project (three cannot read p:path)", async () => {
    const data = await new Mf3Adapter().load(bambuBytes(true));
    expect(data.sourceFormat).toBe("3mf");
    expect(data.plates?.length).toBe(2);
    expect(data.triangleCount).toBe(2);
  });

  it("merges into one plate when no plate config exists", () => {
    const data = parse3mfProject(bambuBytes(false));
    expect(data.plates).toBeUndefined();
    expect(data.triangleCount).toBe(2);
    // Single merged plate centered on the origin: bbox center was
    // (133, 5, 2.5), so the second triangle's first x (256) lands at 123.
    expect(data.positions[9]).toBe(123);
    // Merged bbox is symmetric about the origin.
    expect(data.bboxMin[0]).toBeCloseTo(-133, 10);
    expect(data.bboxMax[0]).toBeCloseTo(133, 10);
  });
});
