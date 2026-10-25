<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as THREE from "three";
  import { createScene } from "../lib/3d/scene";
  import { createControls } from "../lib/3d/controls";
  import { meshDataToGeometry, loadModel } from "../lib/3d/loader";
  import type { MeshData } from "../lib/3d/types";
  import { fitCameraToObject } from "../lib/3d/metrics";
  import {
    selectedPath, meshData, fileSize, renderMode, plateIndex,
    showGrid, showAxes, darkMode, status
  } from "../lib/stores/app";
  import { readModelBytes, bytesToU8 } from "../lib/fs/tauriFs";
  import { get } from "svelte/store";

  let canvas: HTMLCanvasElement;
  let handle: ReturnType<typeof createScene> | null = null;
  let controls: { update: () => void; target: THREE.Vector3; dispose: () => void } | null = null;
  let raf = 0;
  let path: string | null = null;
  let overlay = "No file loaded — pick a file from the tree or toolbar.";
  let data: MeshData | null = null;

  /** Multi-plate project currently loaded, else null. */
  $: plates = data?.plates && data.plates.length > 1 ? data.plates : null;
  $: shownIndex = plates ? Math.min(Math.max($plateIndex, 1), plates.length) : 0;

  function isMultiPlate(d: MeshData | null): d is MeshData & { plates: NonNullable<MeshData["plates"]> } {
    return !!d?.plates && d.plates.length > 1;
  }

  function showPlate(idx: number) {
    if (!handle || !data) return;
    if (isMultiPlate(data)) {
      const clamped = Math.min(Math.max(idx, 1), data.plates.length);
      const p = data.plates[clamped - 1];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(p.positions.slice(), 3));
      geo.computeVertexNormals();
      handle.setModel(geo);
      if (handle.mesh) fitCameraToObject(handle.camera, controls!, handle.mesh);
      status.set({ state: "ready", message: `Plate ${clamped}/${data.plates.length} (${p.name}) — ${p.triangleCount.toFixed(0)} tris` });
    } else {
      handle.setModel(meshDataToGeometry(data));
      if (handle.mesh) fitCameraToObject(handle.camera, controls!, handle.mesh);
    }
  }

  function goPlate(idx: number) {
    if (!plates) return;
    const n = plates.length;
    plateIndex.set(((idx - 1 + n) % n) + 1);
  }
  function prevPlate() { goPlate($plateIndex - 1); }
  function nextPlate() { goPlate($plateIndex + 1); }

  function onKey(e: KeyboardEvent) {
    if (!plates) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "PageUp") prevPlate();
    else if (e.key === "PageDown") nextPlate();
  }

  const unsubs = [
    selectedPath.subscribe(async (p) => {
      path = p;
      if (!p || !handle) return;
      await openFile(p);
    }),
    plateIndex.subscribe((i) => showPlate(i)),
    renderMode.subscribe((m) => handle?.setRenderMode(m)),
    showGrid.subscribe((v) => handle?.setHelpers(v, get(showAxes))),
    showAxes.subscribe((v) => handle?.setHelpers(get(showGrid), v)),
    darkMode.subscribe((d) => {
      handle?.setTheme(d);
      document.documentElement.classList.toggle("light", !d);
    })
  ];

  async function openFile(p: string) {
    if (!handle) return;
    status.set({ state: "loading", message: `Loading ${p}…` });
    overlay = "Loading…";
    try {
      const raw = await readModelBytes(p);
      const bytes = bytesToU8(raw);
      fileSize.set(bytes.length);
      const ext = p.split(".").pop() ?? "";
      const loaded = await loadModel(bytes, ext);
      data = loaded;
      meshData.set(loaded);
      if (isMultiPlate(loaded)) {
        // Multi-plate project: start on Plate 1, never on a merged view.
        // set() may no-op when the previous file left the same value,
        // so render directly to guarantee the new file shows.
        plateIndex.set(1);
        showPlate(1);
      } else {
        plateIndex.set(0);
        showPlate(0);
        if (ext.toLowerCase() === "stl" && get(renderMode) === "textured") {
          status.set({ state: "ready", message: `Loaded ${loaded.triangleCount.toFixed(0)} tris (STL has no textures — showing solid)` });
        } else {
          status.set({ state: "ready", message: `Loaded ${loaded.triangleCount.toFixed(0)} tris` });
        }
      }
      overlay = "";
    } catch (e) {
      status.set({ state: "error", message: String(e instanceof Error ? e.message : e) });
      overlay = `Failed to load:\n${p}\n${String(e instanceof Error ? e.message : e)}`;
    }
  }

  onMount(() => {
    handle = createScene(canvas);
    handle.setTheme(get(darkMode));
    controls = createControls(handle.camera, canvas);
    const loop = () => {
      controls!.update();
      handle!.renderer.render(handle!.scene, handle!.camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    unsubs.forEach((u) => u());
    controls?.dispose();
    handle?.dispose();
  });

  export function fit() {
    if (handle?.mesh) fitCameraToObject(handle.camera, controls!, handle.mesh);
  }
</script>

<div class="viewport-wrap">
  <canvas bind:this={canvas}></canvas>
  {#if overlay}
    <div class="overlay"><pre>{overlay}</pre></div>
  {/if}
  {#if plates && !overlay}
    <div class="plate-pill">Plate {shownIndex} / {plates.length} · {plates[shownIndex - 1].name}</div>
    <button class="plate-nav left" aria-label="Previous plate" on:click={prevPlate}>‹</button>
    <button class="plate-nav right" aria-label="Next plate" on:click={nextPlate}>›</button>
  {/if}
</div>
<svelte:window on:keydown={onKey} />

<style>
  .plate-pill {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
    background: color-mix(in srgb, var(--bg-toolbar) 88%, transparent);
    border: 1px solid var(--border); border-radius: 999px;
    padding: 4px 14px; font-size: 12px; color: var(--fg);
    pointer-events: none; white-space: nowrap;
  }
  .plate-nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; line-height: 1; padding: 0 0 2px 0;
    background: color-mix(in srgb, var(--bg-toolbar) 82%, transparent);
    color: var(--fg); border: 1px solid var(--border);
    opacity: 0.75; cursor: pointer;
  }
  .plate-nav:hover { opacity: 1; border-color: var(--accent); }
  .plate-nav.left { left: 12px; }
  .plate-nav.right { right: 12px; }
</style>
