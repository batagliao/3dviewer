export type RenderMode = "solid" | "wireframe" | "textured";
export type StatusState = "ready" | "loading" | "error" | "empty";

export interface PlateMesh {
  id: string;
  name: string;
  triangleCount: number;
  /** transformed, non-indexed positions for this plate */
  positions: Float32Array;
}

export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  /** triangle count */
  triangleCount: number;
  vertexCount: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  hasUvs: boolean;
  sourceFormat: string;
  /** present only for multi-plate 3MF projects */
  plates?: PlateMesh[];
}

export interface ModelStats {
  format: string;
  fileSize: number;
  triangleCount: number;
  vertexCount: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  dimensions: [number, number, number];
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  loaded?: boolean;
  expanded?: boolean;
}
