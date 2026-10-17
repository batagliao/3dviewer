<script lang="ts">
  import Toolbar from "./components/Toolbar.svelte";
  import LeftTree from "./components/LeftTree.svelte";
  import Viewport from "./components/Viewport.svelte";
  import RightProps from "./components/RightProps.svelte";
  import PanelResizer from "./components/PanelResizer.svelte";
  import StatusBar from "./components/StatusBar.svelte";
  import { panelWidths } from "./lib/stores/app";

  let mainEl: HTMLDivElement;
  $: mainStyle = `--panel-left-w:${$panelWidths.left}px;--panel-right-w:${$panelWidths.right}px;`;
</script>

<div class="app">
  <Toolbar />
  <div class="main" style={mainStyle} bind:this={mainEl}>
    <LeftTree />
    <PanelResizer side="left" container={mainEl} />
    <Viewport />
    <PanelResizer side="right" container={mainEl} />
    <RightProps />
  </div>
  <StatusBar />
</div>
