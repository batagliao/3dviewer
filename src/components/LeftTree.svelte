<script lang="ts">
  import FileIcon from "./FileIcon.svelte";
  import FolderIcon from "./FolderIcon.svelte";
  import type { FileNode } from "../lib/3d/types";
  import { fileTree, selectedPath, rootPath, status } from "../lib/stores/app";
  import { listDirectory } from "../lib/fs/tauriFs";
  import { insertChildren, toggleExpanded, sortNodes } from "../lib/fs/tree";
  import { get } from "svelte/store";

  async function expand(n: FileNode) {
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
        return;
      }
    } else {
      fileTree.update((t) => toggleExpanded(t, n.path));
    }
    // selecting a dir does not load the viewport
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

<div class="panel panel-left">
  <div style="padding:8px;display:flex;gap:6px;">
    <button on:click={chooseRoot}>Open folder</button>
  </div>
  {#snippet node(n: FileNode, sel: string | null)}
    <div class="tree-node">
      <div class={rowClass(n, sel)} on:click={() => expand(n)} on:keydown={(e) => e.key === "Enter" && expand(n)} role="treeitem" aria-selected={sel === n.path} tabindex="0">
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
