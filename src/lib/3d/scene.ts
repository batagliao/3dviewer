import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { RenderMode } from "./types";

export interface SceneHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh | null;
  grid: THREE.GridHelper;
  axes: THREE.AxesHelper;
  setTheme: (dark: boolean) => void;
  setModel: (geo: THREE.BufferGeometry) => void;
  setRenderMode: (mode: RenderMode) => void;
  setHelpers: (grid: boolean, axes: boolean) => void;
  screenshot: () => string;
  dispose: () => void;
}

export function createScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  camera.position.set(100, 70, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 2.0);
  dir.position.set(1, 2, 3).multiplyScalar(100);
  scene.add(dir);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const grid = new THREE.GridHelper(200, 20);
  scene.add(grid);
  const axes = new THREE.AxesHelper(50);
  axes.visible = false;
  scene.add(axes);

  let mesh: THREE.Mesh | null = null;
  let mode: RenderMode = "solid";
  const solidMat = new THREE.MeshStandardMaterial({ color: 0x4f9cf9, roughness: 0.45, metalness: 0.1 });
  const wireMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x4f9cf9 });

  function applyMaterial() {
    if (!mesh) return;
    if (mode === "wireframe") mesh.material = wireMat;
    else mesh.material = solidMat; // textured = solid best-effort (STL has no UVs; OBJ/3MF map if parsed later)
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    renderer,
    scene,
    camera,
    get mesh() {
      return mesh;
    },
    grid,
    axes,
    setTheme(dark: boolean) {
      (scene.background as THREE.Color).set(dark ? 0x1e1e1e : 0xf3f4f6);
    },
    setModel(geo: THREE.BufferGeometry) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      mesh = new THREE.Mesh(geo, solidMat);
      scene.add(mesh);
      applyMaterial();
    },
    setRenderMode(m: RenderMode) {
      mode = m;
      applyMaterial();
    },
    setHelpers(g: boolean, a: boolean) {
      grid.visible = g;
      axes.visible = a;
    },
    screenshot() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    dispose() {
      ro.disconnect();
      pmrem.dispose();
      solidMat.dispose();
      wireMat.dispose();
      renderer.dispose();
    }
  };
}
