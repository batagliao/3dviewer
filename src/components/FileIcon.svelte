<script lang="ts">
  // Inline cube icon (Lucide "box", ISC licensed) — no dependency, crisp at
  // any size and theme-aware via currentColor. More icons at
  // https://lucide.dev, https://tabler.io/icons, https://phosphoricons.com
  export let ext: string = "";
  export let size: number = 14;

  const e = ext.toLowerCase().replace(".", "");
  const cls =
    e === "stl" ? "ext-stl" : e === "obj" ? "ext-obj" : e === "3mf" ? "ext-3mf" : "";
</script>

<svg
  class={cls}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
  <path d="m3.3 7 8.7 5 8.7-5" />
  <path d="M12 22V12" />
</svg>

<style>
  svg {
    flex: none;
    vertical-align: -2px;
  }
  .ext-stl {
    color: #4f9cf9;
  }
  .ext-obj {
    color: #4ade80;
  }
  .ext-3mf {
    color: #fb923c;
  }
  :global(.tree-row.selected) svg {
    color: inherit;
  }
</style>
