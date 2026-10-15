import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { parse3mfProject } from "./threemfProject";
import type { MeshData } from "./types";

export interface ModelAdapter {
  load(bytes: Uint8Array): Promise<MeshData>;
}

function geometryToMeshData(
  geo: THREE.BufferGeometry,
  sourceFormat: string
): MeshData {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nor = g.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute | undefined;
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  return {
    positions: new Float32Array(pos.array),
    normals: nor ? new Float32Array(nor.array) : undefined,
    uvs: uv ? new Float32Array(uv.array) : undefined,
    triangleCount: pos.count / 3,
    vertexCount: pos.count,
    bboxMin: [bb.min.x, bb.min.y, bb.min.z],
    bboxMax: [bb.max.x, bb.max.y, bb.max.z],
    hasUvs: !!uv,
    sourceFormat
  };
}

function firstGeometry(obj: THREE.Object3D): THREE.BufferGeometry | null {
  let found: THREE.BufferGeometry | null = null;
  obj.traverse((c) => {
    if (!found && (c as THREE.Mesh).isMesh) {
      found = ((c as THREE.Mesh).geometry as THREE.BufferGeometry).clone();
    }
  });
  return found;
}

/** Merge all mesh geometries in a group into one (best-effort preview). */
function mergedGeometry(obj: THREE.Object3D): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = [];
  obj.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const g = ((c as THREE.Mesh).geometry as THREE.BufferGeometry).clone();
      c.updateWorldMatrix(true, false);
      g.applyMatrix4(c.matrixWorld);
      geos.push(g.toNonIndexed ? g.toNonIndexed() : g);
    }
  });
  if (geos.length === 0) return null;
  if (geos.length === 1) return geos[0];
  // Manual concat of position/normal/uv
  let posLen = 0,
    uvLen = 0,
    hasUv = geos.every((g) => g.getAttribute("uv"));
  for (const g of geos) {
    posLen += (g.getAttribute("position") as THREE.BufferAttribute).count * 3;
    if (hasUv) uvLen += (g.getAttribute("uv") as THREE.BufferAttribute).count * 2;
  }
  const positions = new Float32Array(posLen);
  const uvs = hasUv ? new Float32Array(uvLen) : undefined;
  let po = 0,
    uo = 0;
  for (const g of geos) {
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    positions.set(p.array as unknown as Float32Array, po);
    po += p.array.length;
    if (hasUv && uvs) {
      const u = g.getAttribute("uv") as THREE.BufferAttribute;
      uvs.set(u.array as unknown as Float32Array, uo);
      uo += u.array.length;
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (uvs) out.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return out;
}

export class StlAdapter implements ModelAdapter {
  async load(bytes: Uint8Array): Promise<MeshData> {
    const loader = new STLLoader();
    const geo = loader.parse(bytes.buffer.slice(0) as ArrayBuffer);
    return geometryToMeshData(geo, "stl");
  }
}

export class ObjAdapter implements ModelAdapter {
  async load(bytes: Uint8Array): Promise<MeshData> {
    const text = new TextDecoder().decode(bytes);
    const obj = new OBJLoader().parse(text);
    const geo = mergedGeometry(obj) ?? firstGeometry(obj);
    if (!geo) throw new Error("No mesh found in OBJ");
    return geometryToMeshData(geo, "obj");
  }
}

export class Mf3Adapter implements ModelAdapter {
  async load(bytes: Uint8Array): Promise<MeshData> {
    try {
      const obj = new ThreeMFLoader().parse(
        bytes.buffer.slice(0) as ArrayBuffer
      );
      const geo = mergedGeometry(obj) ?? firstGeometry(obj);
      if (geo) return geometryToMeshData(geo, "3mf");
    } catch {
      // fall through to project parser below (handles Production
      // Extension p:path parts, dangling components, Bambu plates)
    }
    return parse3mfProject(bytes);
  }
}

/**
 * Minimal 3MF geometry extractor, kept for API compatibility.
 * Delegates to the full project parser (multi-part, transforms, plates)
 * and returns the merged "all plates" geometry.
 */
export function parse3mfGeometryFallback(bytes: Uint8Array): MeshData {
  return parse3mfProject(bytes);
}

export function adapterForExtension(ext: string): ModelAdapter {
  const e = ext.toLowerCase().replace(".", "");
  if (e === "stl") return new StlAdapter();
  if (e === "obj") return new ObjAdapter();
  if (e === "3mf") return new Mf3Adapter();
  throw new Error(`Unsupported extension: ${ext}`);
}

export function loadModel(bytes: Uint8Array, ext: string): Promise<MeshData> {
  return adapterForExtension(ext).load(bytes);
}

export function meshDataToGeometry(data: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(data.positions.slice(), 3));
  if (data.normals) geo.setAttribute("normal", new THREE.BufferAttribute(data.normals.slice(), 3));
  else geo.computeVertexNormals();
  if (data.uvs) geo.setAttribute("uv", new THREE.BufferAttribute(data.uvs.slice(), 2));
  return geo;
}
