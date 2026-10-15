# AGENTS.md

## Commands

- `npm install` — install frontend deps
- `npm run tauri dev` — preferred dev (Wayland workaround is in-code, no env needed)
- `npm run tauri:dev:linux` — fallback only: `GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 tauri dev`
- `npm run check` — `svelte-check --tsconfig ./tsconfig.json`
- `npm run test` — `vitest run` (frontend, jsdom)
- `npx vitest run <path>` — single test, e.g. `src/lib/3d/loader.test.ts`
- `npm run build` — `vite build` → `dist/` (Tauri `frontendDist`, never commit)
- `cargo test --manifest-path src-tauri/Cargo.toml` — Rust tests (Wayland helpers)

No linter/formatter config. Verify with `check` + `test` + `cargo test`.

## Architecture

- Entry: `src/main.ts` mounts `src/App.svelte`; Vite dev `http://localhost:1420` (`strictPort`, `watch.ignored: src-tauri/**`, `clearScreen: false` — don't change).
- 3D loading (`src/lib/3d/`): `loader.ts` owns `ModelAdapter` + `adapterForExtension`/`loadModel`. `StlAdapter` / `ObjAdapter` / `Mf3Adapter` → `MeshData` (non-indexed transformed `positions`). `Mf3Adapter` tries `ThreeMFLoader` then falls back to `threemfProject.ts` (multi-plate, Production Extension `p:path`, Bambu plates). To add a parser: new `ModelAdapter` only — `Viewport.svelte` stays unchanged.
- Viewport: `components/Viewport.svelte` subscribes to stores, calls `loadModel` + `meshDataToGeometry`; plate switching via `plateIndex` (`0` = merged/all, else 1-based into `meshData.plates`).
- File tree: `lib/fs/tree.ts` is pure (`SUPPORTED_EXTS = stl/obj/3mf`, `filterNodes`/`sortNodes`/`insertChildren`/`toggleExpanded`); `lib/fs/tauriFs.ts` wraps `invoke(list_directory|read_model_bytes|get_file_info)`. `LeftTree.svelte` lazy-loads via `insertChildren`.
- State: `lib/stores/app.ts` (`selectedPath`, `meshData`, `plateIndex`, `renderMode`, `fileTree`, `status`, theme flags).
- Backend: `src-tauri/src/main.rs` → `lib.rs::run()`. Only commands: `commands/fs.rs`. Permissions live in `src-tauri/capabilities/default.json` — update it when adding fs/dialog/store usage.

## Gotchas

- `tauriFs.ts` has `isTauri` guard (`__TAURI_INTERNALS__`): returns `[]` / throws in plain `vite dev` or jsdom. Keep it — tests and browser dev depend on it.
- `main.rs` must call `apply_linux_webview_workarounds()` before GTK/WebKit init. `is_native_wayland()` in `lib.rs` is pure + unit-tested: only sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` on native Wayland, never overrides an explicit env, never forces XWayland.
- `vitest.config.ts` has `// @ts-nocheck` and is excluded from `tsconfig.json` (which only includes `src/**` + `vite.config.ts`). Don't "fix" by adding it to tsconfig.
- Svelte 5 + `vitePreprocess()` (`svelte.config.js`); `LeftTree.svelte` uses `{#snippet}` syntax.
- Ignored build output: `dist/`, `src-tauri/target/`, `node_modules/` — don't commit.
