<script lang="ts">
  import FileIcon from "./FileIcon.svelte";
  import FolderIcon from "./FolderIcon.svelte";
  import type { FileNode } from "../lib/3d/types";
  import { fileTree, selectedPath, rootPath, status } from "../lib/stores/app";
  import { listDirectory } from "../lib/fs/tauriFs";
  import {
    insertChildren, toggleExpanded, sortNodes, adjacentPath, visibleNodes, parentPath, firstChildPath
  } from "../lib/fs/tree";
  import { get } from "svelte/store";

  // Selecting a dir does not load the viewport.
  async function expand(n: FileNode, toggle = true) {
    if (!n.isDir) {
      selectedPath.set(n.path);
      return;
    }
    if (!n.loaded) {
      try {
        const kids = await listDirectory(n.path);
        fileTree.update((t) => insertChildren(t, n.path, kids));
      } catch (e) {
        status.set({ state: "error", message: String(e instanceof Error ? e.message : e) });
      }
    } else if (toggle) {
      fileTree.update((t) => toggleExpanded(t, n.path));
    }
  }

  // Browse mode: no focused control, so w/s and arrows move the tree selection.
  const isEditable = () => {
    const t = document.activeElement as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  };

  function nodeAt(tree: FileNode[], path: string | null): FileNode | undefined {
    return visibleNodes(tree).find((x) => x.path === path);
  }

  async function select(next: string | null) {
    if (!next) return;
    selectedPath.set(next);
    const n = nodeAt(get(fileTree), next);
    if (n?.isDir) await expand(n, false); // load dir children so it can be entered, keep it open
    const row = document.querySelector(`.tree-row[data-path="${CSS.escape(next)}"]`);
    (row as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }

  function move(delta: 1 | -1) {
    return select(adjacentPath(get(fileTree), get(selectedPath), delta));
  }

  /** Left/a: collapse a dir, else step out top to the parent row. Right/d: open a dir, or step into it. */
  async function horizontal(outward: boolean) {
    const tree = get(fileTree);
    const n = nodeAt(tree, get(selectedPath));
    if (!n) return;
    if (outward) {
      if (n.isDir && n.expanded) fileTree.update((t) => toggleExpanded(t, n.path));
      else await select(parentPath(tree, n.path));
      return;
    }
    if (!n.isDir) return;
    if (!n.expanded) await expand(n);
    else await select(firstChildPath(get(fileTree), n.path));
  }

  function browseKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") move(-1);
    else if (k === "arrowdown" || k === "s") move(1);
    else if (k === "arrowleft" || k === "a") horizontal(true);
    else if (k === "arrowright" || k === "d") horizontal(false);
    else return false;
    e.preventDefault();
    return true;
  }

  function onWindowKey(e: KeyboardEvent) {
    if (isEditable()) return;
    browseKey(e);
  }

  async function chooseRoot() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true });
      if (typeof dir === "string") {
        rootPath.set(dir);
        const kids = await listDirectory(dir);
        fileTree.set(sortNodes(kids.map((k) => ({ ...k, expanded: false }))));
      }
    } catch (e) {
      status.set({ state: "error", message: String(e instanceof Error ? e.message : e) });
    }
  }

  function rowClass(n: FileNode, sel: string | null) {
    return "tree-row" + (sel === n.path ? " selected" : "");
  }
</script>

<svelte:window on:keydown={onWindowKey} />

<div class="panel panel-left">
  <div style="padding:8px;display:flex;gap:6px;">
    <button on:click={chooseRoot}>Open folder</button>
  </div>
  {#snippet node(n: FileNode, sel: string | null)}
    <div class="tree-node">
      <div class={rowClass(n, sel)} on:click={() => expand(n)} on:keydown={(e) => (e.key === "Enter" ? expand(n) : browseKey(e))} role="treeitem" aria-selected={sel === n.path} tabindex="0" data-path={n.path}>
        {#if n.isDir}
          <FolderIcon open={!!n.expanded} />
        {:else}
          <FileIcon ext={n.name.split(".").pop() ?? ""} />
        {/if}
        <span>{n.name}</span>
      </div>
      {#if n.isDir && n.expanded && n.children}
        <div class="tree-children">
          {#each n.children as c (c.path)}
            {@render node(c, sel)}
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
  {#each $fileTree as n (n.path)}
    {@render node(n, $selectedPath)}
  {/each}
  {#if $fileTree.length === 0}
    <div style="padding:8px;color:var(--fg-dim)">No folder loaded. Click “Open folder”.</div>
  {/if}
</div>
