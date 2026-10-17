/** Minimum width (px) either side panel may shrink to. */
export const MIN_PANEL_WIDTH = 160;
/** Minimum width (px) the viewport keeps for itself while a panel is dragged. */
export const MIN_VIEWPORT_WIDTH = 320;
/** Default width (px) of each side panel. */
export const DEFAULT_PANEL_WIDTH = 260;

export type PanelSide = "left" | "right";
export type PanelWidths = { left: number; right: number };
/** Horizontal bounds of the main area, e.g. from getBoundingClientRect(). */
export type Bounds = { left: number; right: number };

/** Clamp a panel width so both panels and the viewport stay usable. */
export function clampPanelWidth(desired: number, containerWidth: number, otherWidth: number): number {
  const max = Math.max(MIN_PANEL_WIDTH, containerWidth - otherWidth - MIN_VIEWPORT_WIDTH);
  return Math.min(Math.max(desired, MIN_PANEL_WIDTH), max);
}

/** Panel width implied by a pointer position inside the main area. */
export function widthFromPointer(side: PanelSide, clientX: number, bounds: Bounds): number {
  return side === "left" ? clientX - bounds.left : bounds.right - clientX;
}

/** New widths after dragging `side` so its inner edge sits at `clientX`. */
export function resizePanel(
  side: PanelSide,
  clientX: number,
  bounds: Bounds,
  widths: PanelWidths
): PanelWidths {
  const desired = widthFromPointer(side, clientX, bounds);
  const other = side === "left" ? widths.right : widths.left;
  const width = clampPanelWidth(desired, bounds.right - bounds.left, other);
  return side === "left" ? { ...widths, left: width } : { ...widths, right: width };
}
