pub mod commands;
use commands::fs::{get_file_info, list_directory, read_model_bytes};

/// Returns true when we are on a native Wayland session (not XWayland).
/// Pure function so it can be unit tested; `gdk_backend` is $GDK_BACKEND.
pub fn is_native_wayland(
    session_type: &str,
    wayland_display: Option<&str>,
    gdk_backend: Option<&str>,
) -> bool {
    if gdk_backend == Some("x11") {
        return false;
    }
    session_type == "wayland" || wayland_display.is_some_and(|d| !d.is_empty())
}

/// Must run before any GTK/WebKit init. Keeps native Wayland (no XWayland)
/// and only disables WebKit's DMA-BUF renderer, which is what raises
/// `Error 71 (Protocol error) dispatching to Wayland display` on several
/// compositors. Respects an explicitly set $WEBKIT_DISABLE_DMABUF_RENDERER.
#[cfg(target_os = "linux")]
pub fn apply_linux_webview_workarounds() {
    let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_default();
    let display = std::env::var("WAYLAND_DISPLAY").ok();
    let gdk = std::env::var("GDK_BACKEND").ok();
    if is_native_wayland(&session, display.as_deref(), gdk.as_deref())
        && std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none()
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            list_directory,
            read_model_bytes,
            get_file_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod wayland_tests {
    use super::is_native_wayland;

    #[test]
    fn detects_wayland_session() {
        assert!(is_native_wayland("wayland", Some("wayland-1"), None));
        assert!(is_native_wayland("", Some("wayland-1"), None));
        assert!(!is_native_wayland("x11", None, None));
        assert!(!is_native_wayland("wayland", Some("wayland-1"), Some("x11")));
        assert!(!is_native_wayland("", None, None));
    }
}
