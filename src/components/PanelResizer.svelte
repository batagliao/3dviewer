<script lang="ts">
  import { onDestroy } from "svelte";
  import { panelWidths } from "../lib/stores/app";
  import { clampPanelWidth, resizePanel, type PanelSide } from "../lib/ui/resize";

  export let side: PanelSide;
  /** The `.main` element the panels live in; drag math uses its bounds. */
  export let container: HTMLElement | null = null;

  let el: HTMLDivElement;
  let dragging = false;

  onDestroy(() => document.body.classList.remove("resizing"));

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !container) return;
    e.preventDefault();
    dragging = true;
    document.body.classList.add("resizing");
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !container) return;
    panelWidths.update((w) => resizePanel(side, e.clientX, container.getBoundingClientRect(), w));
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("resizing");
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }

  function nudge(delta: number) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    panelWidths.update((w) => {
      const width = clampPanelWidth(w[side] + delta, rect.width, side === "left" ? w.right : w.left);
      return side === "left" ? { ...w, left: width } : { ...w, right: width };
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 48 : 16;
    // Arrow toward the center of the window widens this panel.
    if (e.key === (side === "left" ? "ArrowRight" : "ArrowLeft")) nudge(step);
    else if (e.key === (side === "left" ? "ArrowLeft" : "ArrowRight")) nudge(-step);
    else return;
    e.preventDefault();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<div
  class="panel-resizer {side}"
  class:dragging
  bind:this={el}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize {side} panel"
  tabindex="0"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:keydown={onKeyDown}
></div>
