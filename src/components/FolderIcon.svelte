<script lang="ts">
  // Inline folder icons (Lucide "folder" / "folder-open", ISC licensed).
  // Same stroke art line as FileIcon.svelte.
  export let open: boolean = false;
  export let size: number = 14;
</script>

<svg
  class="folder"
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
  {#if open}
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.84 1.2a2 2 0 0 0 1.7.9H18a2 2 0 0 1 2 2v2" />
  {:else}
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  {/if}
</svg>

<style>
  svg {
    flex: none;
    vertical-align: -2px;
    color: #fbbf24;
  }
</style>
