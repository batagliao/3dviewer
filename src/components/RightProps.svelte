<script lang="ts">
  import { meshData, selectedPath, fileSize, plateIndex } from "../lib/stores/app";
  import { formatBytes, meshStats } from "../lib/3d/metrics";
</script>

<div class="panel panel-right">
  <h3 style="margin:0 0 8px">Properties</h3>
  {#if $meshData && $selectedPath}
    {@const s = meshStats($meshData)}
    <dl class="kv">
      <dt>File</dt><dd>{$selectedPath.split("/").pop()}</dd>
      <dt>Format</dt><dd>{$meshData.sourceFormat}</dd>
      <dt>Size</dt><dd>{formatBytes($fileSize)}</dd>
      <dt>Triangles</dt><dd>{$meshData.triangleCount.toFixed(0)}</dd>
      <dt>Vertices</dt><dd>{$meshData.vertexCount.toFixed(0)}</dd>
      <dt>Dimensions</dt><dd>{s.dimensions.map((d) => d.toFixed(2)).join(" × ")}</dd>
      <dt>BBox min</dt><dd>{$meshData.bboxMin.map((d) => d.toFixed(2)).join(", ")}</dd>
      <dt>BBox max</dt><dd>{$meshData.bboxMax.map((d) => d.toFixed(2)).join(", ")}</dd>
      <dt>UVs</dt><dd>{$meshData.hasUvs ? "yes" : "no"}</dd>
      {#if $meshData.plates}
        <dt>Plates</dt><dd>{$meshData.plates.length}</dd>
        {#if $plateIndex > 0 && $meshData.plates[$plateIndex - 1]}
          <dt>Plate tris</dt><dd>{$meshData.plates[$plateIndex - 1].triangleCount.toFixed(0)}</dd>
        {/if}
      {/if}
    </dl>
  {:else}
    <div style="color:var(--fg-dim)">Select a model to see properties.</div>
  {/if}
</div>
