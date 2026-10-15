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

  function showPlate(idx: number) {
    if (!handle || !data) return;
    if (idx > 0 && data.plates?.[idx - 1]) {
      const pos = data.plates[idx - 1].positions;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
      geo.computeVertexNormals();
      handle.setModel(geo);
    } else {
      handle.setModel(meshDataToGeometry(data));
    }
    if (handle.mesh) fitCameraToObject(handle.camera, controls!, handle.mesh);
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
      plateIndex.set(0);
      handle.setModel(meshDataToGeometry(loaded));
      if (handle.mesh) fitCameraToObject(handle.camera, controls!, handle.mesh);
      const plateInfo =
        loaded.plates && loaded.plates.length > 1
          ? ` (${loaded.plates.length} plates — use the plate slider)`
          : "";
      if (ext.toLowerCase() === "stl" && get(renderMode) === "textured") {
        status.set({ state: "ready", message: `Loaded ${loaded.triangleCount.toFixed(0)} tris (STL has no textures — showing solid)` });
      } else {
        status.set({ state: "ready", message: `Loaded ${loaded.triangleCount.toFixed(0)} tris${plateInfo}` });
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
</div>
