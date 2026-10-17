import { describe, it, expect } from "vitest";
import {
  clampPanelWidth, widthFromPointer, resizePanel,
  MIN_PANEL_WIDTH, MIN_VIEWPORT_WIDTH, DEFAULT_PANEL_WIDTH
} from "./resize";

const bounds = { left: 0, right: 1000 };

describe("resize", () => {
  it("clamps to the minimum panel width", () => {
    expect(clampPanelWidth(10, 1000, 260)).toBe(MIN_PANEL_WIDTH);
    expect(clampPanelWidth(MIN_PANEL_WIDTH, 1000, 260)).toBe(MIN_PANEL_WIDTH);
  });

  it("clamps so the viewport keeps its minimum width", () => {
    // 1000 - other panel 260 - viewport minimum = 580 max
    expect(clampPanelWidth(900, 1000, 260)).toBe(1000 - 260 - MIN_VIEWPORT_WIDTH);
  });

  it("still allows the minimum when the window is tiny", () => {
    expect(clampPanelWidth(500, 500, 400)).toBe(MIN_PANEL_WIDTH);
    expect(clampPanelWidth(1, 0, 0)).toBe(MIN_PANEL_WIDTH);
  });

  it("passes valid widths through", () => {
    expect(clampPanelWidth(DEFAULT_PANEL_WIDTH, 1000, 260)).toBe(DEFAULT_PANEL_WIDTH);
  });

  it("measures width from the pointer for each side", () => {
    expect(widthFromPointer("left", 300, bounds)).toBe(300);
    expect(widthFromPointer("right", 700, bounds)).toBe(300);
    // main area not anchored at 0
    const b = { left: 100, right: 700 };
    expect(widthFromPointer("left", 400, b)).toBe(300);
    expect(widthFromPointer("right", 400, b)).toBe(300);
  });

  it("resizes only the dragged side and leaves the other untouched", () => {
    const widths = { left: 260, right: 260 };
    expect(resizePanel("left", 400, bounds, widths)).toEqual({ left: 400, right: 260 });
    expect(resizePanel("right", 650, bounds, widths)).toEqual({ left: 260, right: 350 });
    expect(widths).toEqual({ left: 260, right: 260 });
  });

  it("clamps the dragged side against the other panel", () => {
    const widths = { left: 260, right: 300 };
    // left may grow to 1000 - 300 - 320 = 380
    expect(resizePanel("left", 900, bounds, widths)).toEqual({ left: 380, right: 300 });
    // right may grow to 1000 - 260 - 320 = 420
    expect(resizePanel("right", 0, bounds, widths)).toEqual({ left: 260, right: 420 });
  });
});
