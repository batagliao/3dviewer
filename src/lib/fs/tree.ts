import type { FileNode } from "../3d/types";

export const SUPPORTED_EXTS = new Set(["stl", "obj", "3mf"]);

export function isSupportedFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return SUPPORTED_EXTS.has(name.slice(dot + 1).toLowerCase());
}

export function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function filterNodes(nodes: FileNode[]): FileNode[] {
  return nodes.filter((n) => n.isDir || isSupportedFile(n.name));
}

/** Insert lazily-loaded children into a tree, returns new tree. */
export function insertChildren(
  tree: FileNode[],
  dirPath: string,
  children: FileNode[]
): FileNode[] {
  return tree.map((n) => {
    if (n.path === dirPath) {
      return { ...n, children: sortNodes(filterNodes(children)), loaded: true, expanded: true };
    }
    if (n.children) return { ...n, children: insertChildren(n.children, dirPath, children) };
    return n;
  });
}

/** Flattened top-to-bottom list of rows the user can see (expanded dirs included). */
export function visibleNodes(tree: FileNode[]): FileNode[] {
  return tree.flatMap((n) => (n.isDir && n.expanded && n.children ? [n, ...visibleNodes(n.children)] : [n]));
}

/** Neighbour of path in flattened row order; null when there is none (or path is not visible). */
export function adjacentPath(tree: FileNode[], path: string | null, delta: 1 | -1): string | null {
  const rows = visibleNodes(tree);
  const i = rows.findIndex((n) => n.path === path);
  if (i < 0) return null;
  return rows[i + delta]?.path ?? null;
}

export function toggleExpanded(tree: FileNode[], dirPath: string): FileNode[] {
  return tree.map((n) => {
    if (n.path === dirPath) return { ...n, expanded: !n.expanded };
    if (n.children) return { ...n, children: toggleExpanded(n.children, dirPath) };
    return n;
  });
}
