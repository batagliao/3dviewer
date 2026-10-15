<script lang="ts">
  import { status, selectedPath, meshData } from "../lib/stores/app";
</script>

<div class="statusbar">
  <span>{$status.state}</span>
  <span style="overflow:hidden;text-overflow:ellipsis">{$status.message}</span>
  <span style="flex:1"></span>
  {#if $meshData}
    <span>{$meshData.triangleCount.toFixed(0)} tris</span>
  {/if}
  <span>{$selectedPath ?? ""}</span>
</div>
