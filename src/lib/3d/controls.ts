import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createControls(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement
): OrbitControls {
  const c = new OrbitControls(camera, dom);
  c.enableDamping = true;
  c.dampingFactor = 0.08;
  c.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  } as never;
  return c;
}
