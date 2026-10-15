# 3D Viewer (Tauri + Svelte + Three.js)

Folder-based preview app for STL / OBJ / 3MF.

## Run

```sh
npm install
npm run tauri dev
```

On Wayland (e.g. CachyOS/KDE) WebKitGTK can crash with
`Error 71 (Protocol error) dispatching to Wayland display`.
The app handles this in code (`apply_linux_webview_workarounds` in
`src-tauri/src/lib.rs`, called from `src-tauri/src/main.rs` before GTK
initializes): on native Wayland it sets `WEBKIT_DISABLE_DMABUF_RENDERER=1`
for its own process, so plain `npm run tauri dev` just works. An explicitly
exported `WEBKIT_DISABLE_DMABUF_RENDERER` is always respected. X11 sessions
are untouched, and no XWayland is forced.

Fallback (plain XWayland) if you ever need it:

```sh
npm run tauri:dev:linux
# = GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 tauri dev
```

## Checks

```sh
npm run check    # svelte-check
npm run test     # vitest (frontend)
npm run build    # vite build -> dist/
cargo test --manifest-path src-tauri/Cargo.toml
```

## Layout

- `src/lib/3d/` — `ModelAdapter` interface (`StlAdapter`, `ObjAdapter`, `Mf3Adapter`), scene, controls, metrics
- `src/lib/fs/` — lazy tree helpers + Tauri invoke wrappers
- `src/lib/stores/app.ts` — selection, mesh data, render mode, theme, status
- `src/components/` — Toolbar, LeftTree, Viewport, RightProps, StatusBar
- `src-tauri/src/commands/fs.rs` — `list_directory`, `read_model_bytes`, `get_file_info`

To swap in a Rust/WASM parser later, add a new `ModelAdapter` — `Viewport.svelte` doesn't change.
