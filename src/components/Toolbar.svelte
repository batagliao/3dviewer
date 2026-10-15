<script lang="ts">
  import { renderMode, showGrid, showAxes, darkMode, selectedPath, status, meshData, plateIndex } from "../lib/stores/app";
  import type { RenderMode } from "../lib/3d/types";

  function setMode(m: RenderMode) { renderMode.set(m); }

  async function openFile() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const f = await open({ filters: [{ name: "3D models", extensions: ["stl", "obj", "3mf"] }] });
      if (typeof f === "string") selectedPath.set(f);
    } catch (e) {
      status.set({ state: "error", message: String(e instanceof Error ? e.message : e) });
    }
  }
</script>

<div class="toolbar">
  <button on:click={openFile}>Open file</button>
  <span style="width:8px"></span>
  <button class:active={$renderMode === "solid"} on:click={() => setMode("solid")}>Solid</button>
  <button class:active={$renderMode === "wireframe"} on:click={() => setMode("wireframe")}>Wireframe</button>
  <button class:active={$renderMode === "textured"} on:click={() => setMode("textured")}>Textured</button>
  <span style="width:8px"></span>
  <button class:active={$showGrid} on:click={() => showGrid.set(!$showGrid)}>Grid</button>
  <button class:active={$showAxes} on:click={() => showAxes.set(!$showAxes)}>Axes</button>
  {#if $meshData?.plates && $meshData.plates.length > 1}
    <span style="width:8px"></span>
    <span style="color:var(--fg-dim)">Plate</span>
    <input
      type="range" min="0" max={$meshData.plates.length} step="1"
      value={$plateIndex}
      on:input={(e) => plateIndex.set(parseInt((e.target as HTMLInputElement).value, 10))}
      title="0 = all plates"
      style="width:110px;accent-color:var(--accent)"
    />
    <span style="min-width:90px">{$plateIndex === 0 ? "All" : $meshData.plates[$plateIndex - 1].name}</span>
  {/if}
  <span style="flex:1"></span>
  <button on:click={() => darkMode.set(!$darkMode)}>{$darkMode ? "☀ Light" : "🌙 Dark"}</button>
</div>
