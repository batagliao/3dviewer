import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "../3d/types";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function listDirectory(path: string): Promise<FileNode[]> {
  if (!isTauri) {
    // Browser dev fallback: empty (tests / vite dev without Tauri still work)
    return [];
  }
  return invoke<FileNode[]>("list_directory", { path });
}

export async function readModelBytes(path: string): Promise<number[]> {
  if (!isTauri) throw new Error("Tauri runtime required to read files");
  return invoke<number[]>("read_model_bytes", { path });
}

export async function getFileInfo(path: string): Promise<{ size: number; extension: string }> {
  if (!isTauri) throw new Error("Tauri runtime required");
  return invoke("get_file_info", { path });
}

export function bytesToU8(data: number[]): Uint8Array {
  return Uint8Array.from(data);
}
