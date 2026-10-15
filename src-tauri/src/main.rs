#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Detect X vs Wayland and apply the WebKit workaround *before*
    // GTK/WebKit initializes, so end users never need env vars.
    #[cfg(target_os = "linux")]
    viewer3d_lib::apply_linux_webview_workarounds();
    viewer3d_lib::run();
}
