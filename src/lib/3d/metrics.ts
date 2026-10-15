import * as THREE from "three";
import type { MeshData } from "./types";

export function meshStats(data: MeshData) {
  const dx = data.bboxMax[0] - data.bboxMin[0];
  const dy = data.bboxMax[1] - data.bboxMin[1];
  const dz = data.bboxMax[2] - data.bboxMin[2];
  return {
    triangleCount: data.triangleCount,
    vertexCount: data.vertexCount,
    dimensions: [dx, dy, dz] as [number, number, number]
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

/** Fit camera so the whole model is visible. */
export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  object: THREE.Object3D,
  offset = 1.4
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size, 1e-6);
  const fov = (camera.fov * Math.PI) / 180;
  let dist = (maxDim / 2 / Math.tan(fov / 2)) * offset;
  const dir = new THREE.Vector3(1, 0.7, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = Math.max(dist / 1000, 0.01);
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}
