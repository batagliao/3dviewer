import type { MeshData, PlateMesh } from "./types";
import * as THREE from "three";
import { unzipSync } from "fflate";

interface CompRef {
  objectId: string;
  path?: string;
  matrix: THREE.Matrix4;
}

interface ObjDef {
  /** flat xyz, non-indexed local positions (mesh defined directly) */
  mesh?: Float32Array;
  components: CompRef[];
}

interface AssembleItem {
  objectId: string;
  instanceId: string;
  matrix: THREE.Matrix4;
}

/** 3MF transform strings are 12 floats; same convention as three's loader. */
function parseTransform(s: string | null): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (!s) return m;
  const t = s.trim().split(/\s+/).map(Number);
  if (t.length !== 12 || t.some(Number.isNaN)) return new THREE.Matrix4();
  m.set(
    t[0], t[3], t[6], t[9],
    t[1], t[4], t[7], t[10],
    t[2], t[5], t[8], t[11],
    0, 0, 0, 1
  );
  return m;
}

/** Elements by local tag name (namespace-prefix agnostic). */
function findAll(root: Document | Element, name: string): Element[] {
  const out: Element[] = [];
  const all = root.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const local = (el.localName ?? el.tagName).split(":").pop()!.toLowerCase();
    if (local === name) out.push(el as unknown as Element);
  }
  return out;
}

/** Direct children only, by local tag name. */
function childrenNamed(el: Element, name: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const c = el.children[i];
    const local = (c.localName ?? c.tagName).split(":").pop()!.toLowerCase();
    if (local === name) out.push(c);
  }
  return out;
}

/** Attribute by local name (handles p:path vs path). */
function attr(el: Element, name: string): string | null {
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const local = (a.localName ?? a.name).split(":").pop()!.toLowerCase();
    if (local === name.toLowerCase()) return a.value;
  }
  return null;
}

function parseMeshEl(meshEl: Element): Float32Array | null {
  const verts: number[] = [];
  for (const v of findAll(meshEl, "vertex")) {
    verts.push(
      parseFloat(attr(v, "x") ?? "0"),
      parseFloat(attr(v, "y") ?? "0"),
      parseFloat(attr(v, "z") ?? "0")
    );
  }
  const pos: number[] = [];
  for (const t of findAll(meshEl, "triangle")) {
    for (const k of ["v1", "v2", "v3"]) {
      const idx = parseInt(attr(t, k) ?? "-1", 10);
      if (!(idx >= 0 && idx * 3 + 2 < verts.length)) return null;
      pos.push(verts[idx * 3], verts[idx * 3 + 1], verts[idx * 3 + 2]);
    }
  }
  return pos.length > 0 ? new Float32Array(pos) : null;
}

interface ModelFile {
  name: string;
  doc: Document;
  objects: Map<string, ObjDef>;
}

function parseModelFile(name: string, bytes: Uint8Array): ModelFile | null {
  const doc = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    "application/xml"
  );
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const objects = new Map<string, ObjDef>();
  for (const o of findAll(doc, "object")) {
    const id = attr(o, "id");
    if (!id) continue;
    // Only treat <object> nodes that actually own a mesh/components subtree
    // (avoids picking up nested matches); take direct mesh child first.
    let mesh: Float32Array | null = null;
    for (const m of childrenNamed(o, "mesh")) {
      mesh = parseMeshEl(m);
      if (mesh) break;
    }
    const components: CompRef[] = [];
    for (const c of findAll(o, "component")) {
      const oid = attr(c, "objectid");
      if (!oid) continue;
      components.push({
        objectId: oid,
        path: attr(c, "path") ?? undefined,
        matrix: parseTransform(attr(c, "transform"))
      });
    }
    if (mesh || components.length > 0) objects.set(id, { mesh: mesh ?? undefined, components });
  }
  return { name, doc, objects };
}

const normPath = (p: string) => p.replace(/^\//, "").toLowerCase();

/**
 * Full 3MF-project parse: multi-part geometry (Production Extension p:path),
 * build transforms, and Bambu/Orca plate assignments. Returns one MeshData
 * with per-plate geometry for the plate slider.
 */
export function parse3mfProject(bytes: Uint8Array): MeshData {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error("Not a valid 3MF (zip) file");
  }
  const names = Object.keys(entries);
  const lower = new Map(names.map((n) => [n.toLowerCase(), n]));
  const modelNames = names.filter((n) => n.toLowerCase().endsWith(".model"));
  if (modelNames.length === 0) throw new Error("No .model part found in 3MF");

  const rootName =
    lower.get("3d/3dmodel.model") ??
    modelNames.find((n) => n.toLowerCase().startsWith("3d/")) ??
    modelNames[0];
  const files = new Map<string, ModelFile>();
  for (const n of modelNames) {
    const f = parseModelFile(n, entries[n]);
    if (f) files.set(normPath(n), f);
  }
  const root = files.get(normPath(rootName));
  if (!root) throw new Error("Invalid 3MF model XML");

  // Object lookup across files (ids are package-global per spec).
  const findObject = (id: string, hintFile?: string): { def: ObjDef; file: string } | null => {
    if (hintFile) {
      const f = files.get(normPath(hintFile));
      const d = f?.objects.get(id);
      if (d) return { def: d, file: normPath(hintFile) };
    }
    if (hintFile === undefined) {
      const d = root.objects.get(id);
      if (d) return { def: d, file: normPath(rootName) };
    }
    for (const [fname, f] of files) {
      const d = f.objects.get(id);
      if (d) return { def: d, file: fname };
    }
    return null;
  };

  // Expand an object to local (pre-instance) non-indexed positions.
  const localCache = new Map<string, Float32Array | null>();
  const resolveLocal = (id: string, hintFile: string | undefined, seen: Set<string>): Float32Array | null => {
    const found = findObject(id, hintFile);
    if (!found) return null;
    const key = `${found.file}::${id}`;
    if (localCache.has(key)) return localCache.get(key)!;
    if (seen.has(key)) return null; // cycle guard
    seen.add(key);
    const parts: Float32Array[] = [];
    if (found.def.mesh) parts.push(found.def.mesh);
    const v = new THREE.Vector3();
    for (const c of found.def.components) {
      const sub = resolveLocal(c.objectId, c.path, seen);
      if (!sub) continue;
      const out = new Float32Array(sub.length);
      for (let i = 0; i < sub.length; i += 3) {
        v.set(sub[i], sub[i + 1], sub[i + 2]).applyMatrix4(c.matrix);
        out[i] = v.x;
        out[i + 1] = v.y;
        out[i + 2] = v.z;
      }
      parts.push(out);
    }
    seen.delete(key);
    if (parts.length === 0) {
      localCache.set(key, null);
      return null;
    }
    let total = 0;
    for (const p of parts) total += p.length;
    const merged = new Float32Array(total);
    let o = 0;
    for (const p of parts) {
      merged.set(p, o);
      o += p.length;
    }
    localCache.set(key, merged);
    return merged;
  };

  const applyMatrix = (src: Float32Array, m: THREE.Matrix4): Float32Array => {
    const out = new Float32Array(src.length);
    const v = new THREE.Vector3();
    for (let i = 0; i < src.length; i += 3) {
      v.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(m);
      out[i] = v.x;
      out[i + 1] = v.y;
      out[i + 2] = v.z;
    }
    return out;
  };

  // Root build items (authoritative placement per 3MF core).
  const buildItems: Array<{ objectId: string; matrix: THREE.Matrix4 }> = [];
  for (const b of findAll(root.doc, "build")) {
    for (const item of childrenNamed(b, "item")) {
      const oid = attr(item, "objectid");
      if (oid) buildItems.push({ objectId: oid, matrix: parseTransform(attr(item, "transform")) });
    }
  }

  // Bambu/Orca plate assignments + assemble transforms.
  interface PlateDef {
    id: string;
    name: string;
    instances: Array<{ objectId: string; instanceId: string }>;
  }
  const plates: PlateDef[] = [];
  const assemble: AssembleItem[] = [];
  const cfgName = lower.get("metadata/model_settings.config");
  if (cfgName) {
    const doc = new DOMParser().parseFromString(
      new TextDecoder().decode(entries[cfgName]),
      "application/xml"
    );
    if (doc.getElementsByTagName("parsererror").length === 0) {
      for (const p of findAll(doc, "plate")) {
        const meta = new Map<string, string>();
        for (const m of childrenNamed(p, "metadata")) {
          const k = attr(m, "key");
          if (k) meta.set(k, attr(m, "value") ?? "");
        }
        const id = meta.get("plater_id") ?? String(plates.length + 1);
        const instances: PlateDef["instances"] = [];
        for (const mi of findAll(p, "model_instance")) {
          const im = new Map<string, string>();
          for (const m of childrenNamed(mi, "metadata")) {
            const k = attr(m, "key");
            if (k) im.set(k, attr(m, "value") ?? "");
          }
          const oid = im.get("object_id");
          if (oid) instances.push({ objectId: oid, instanceId: im.get("instance_id") ?? "0" });
        }
        plates.push({
          id,
          name: meta.get("plater_name") || `Plate ${id}`,
          instances
        });
      }
      for (const a of findAll(doc, "assemble_item")) {
        const oid = attr(a, "object_id");
        if (!oid) continue;
        assemble.push({
          objectId: oid,
          instanceId: attr(a, "instance_id") ?? "0",
          matrix: parseTransform(attr(a, "transform"))
        });
      }
    }
  }

  const byObjectId = new Map<string, typeof buildItems>();
  for (const b of buildItems) {
    const l = byObjectId.get(b.objectId) ?? [];
    l.push(b);
    byObjectId.set(b.objectId, l);
  }
  const assembleKey = (oid: string, iid: string) => `${oid}::${iid}`;
  const assembleById = new Map(assemble.map((a) => [assembleKey(a.objectId, a.instanceId), a]));

  /** Placed, transformed positions for one (object, matrix) instance. */
  const place = (objectId: string, matrix: THREE.Matrix4): Float32Array | null => {
    const local = resolveLocal(objectId, undefined, new Set());
    if (!local) return null;
    return applyMatrix(local, matrix);
  };

  const mergeParts = (parts: Float32Array[]): Float32Array => {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Float32Array(total);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };

  const plateMeshes: PlateMesh[] = [];
  if (plates.length > 0) {
    for (const p of plates) {
      const parts: Float32Array[] = [];
      for (const inst of p.instances) {
        const a = assembleById.get(assembleKey(inst.objectId, inst.instanceId));
        if (a) {
          const g = place(inst.objectId, a.matrix);
          if (g) parts.push(g);
          continue;
        }
        // No assemble entry: fall back to nth build item with same object id.
        const cands = byObjectId.get(inst.objectId) ?? [];
        const b = cands[parseInt(inst.instanceId, 10)] ?? cands[0];
        if (b) {
          const g = place(inst.objectId, b.matrix);
          if (g) parts.push(g);
        }
      }
      if (parts.length > 0) {
        const positions = mergeParts(parts);
        plateMeshes.push({
          id: p.id,
          name: p.name,
          triangleCount: positions.length / 9,
          positions
        });
      }
    }
  } else if (buildItems.length > 0) {
    const parts: Float32Array[] = [];
    for (const b of buildItems) {
      const g = place(b.objectId, b.matrix);
      if (g) parts.push(g);
    }
    if (parts.length > 0) {
      const positions = mergeParts(parts);
      plateMeshes.push({ id: "1", name: "Plate 1", triangleCount: positions.length / 9, positions });
    }
  } else {
    // No build info at all: raw concatenation of every mesh (legacy behavior).
    const parts: Float32Array[] = [];
    for (const [, f] of files) {
      for (const [, o] of f.objects) {
        if (o.mesh) parts.push(o.mesh);
      }
    }
    if (parts.length > 0) {
      const positions = mergeParts(parts);
      plateMeshes.push({ id: "1", name: "Plate 1", triangleCount: positions.length / 9, positions });
    }
  }

  if (plateMeshes.length === 0) {
    // Structured parse resolved nothing (e.g. build items referencing
    // unknown objects): show every mesh found, untransformed.
    const parts: Float32Array[] = [];
    for (const [, f] of files) {
      for (const [, o] of f.objects) {
        if (o.mesh) parts.push(o.mesh);
      }
    }
    if (parts.length > 0) {
      const positions = mergeParts(parts);
      plateMeshes.push({ id: "1", name: "Plate 1", triangleCount: positions.length / 9, positions });
    }
  }

  if (plateMeshes.length === 0) throw new Error("No mesh found in 3MF");

  const all = mergeParts(plateMeshes.map((p) => p.positions));
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < all.length; i += 3) {
    const x = all[i], y = all[i + 1], z = all[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    positions: all,
    triangleCount: all.length / 9,
    vertexCount: all.length / 3,
    bboxMin: [minX, minY, minZ],
    bboxMax: [maxX, maxY, maxZ],
    hasUvs: false,
    sourceFormat: "3mf",
    // Single-plate files behave exactly as before (no slider).
    plates: plateMeshes.length > 1 ? plateMeshes : undefined
  };
}
