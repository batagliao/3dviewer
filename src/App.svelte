<script lang="ts">
  import Toolbar from "./components/Toolbar.svelte";
  import LeftTree from "./components/LeftTree.svelte";
  import Viewport from "./components/Viewport.svelte";
  import RightProps from "./components/RightProps.svelte";
  import StatusBar from "./components/StatusBar.svelte";
</script>

<div class="app">
  <Toolbar />
  <div class="main">
    <LeftTree />
    <Viewport />
    <RightProps />
  </div>
  <StatusBar />
</div>
