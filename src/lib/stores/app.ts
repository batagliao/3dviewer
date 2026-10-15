import { writable } from "svelte/store";
import type { MeshData, RenderMode, StatusState, FileNode } from "../3d/types";

export const selectedPath = writable<string | null>(null);
export const meshData = writable<MeshData | null>(null);
export const fileSize = writable<number>(0);
export const renderMode = writable<RenderMode>("solid");
/** 0 = all plates, otherwise 1-based index into meshData.plates */
export const plateIndex = writable<number>(0);
export const showGrid = writable(true);
export const showAxes = writable(false);
export const darkMode = writable(true);
export const status = writable<{ state: StatusState; message: string }>({
  state: "empty",
  message: "No file loaded"
});
export const fileTree = writable<FileNode[]>([]);
export const rootPath = writable<string>("");
