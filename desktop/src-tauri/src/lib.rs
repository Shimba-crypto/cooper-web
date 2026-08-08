// CooperWeb desktop client — hybrid launcher.
// Launcher window: local UI (frontendDist).
// "Launch" opens a native WebView window pointing at the live CooperWeb site.

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const SITE_URL: &str = "https://chikondi-dot.web.app";

/// Open (or focus) the main CooperWeb window in its own native WebView.
#[tauri::command]
fn open_site(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("site") {
        win.show().map_err(|e| e.to_string())?;
        return Ok(());
    }
    let url = WebviewUrl::External(SITE_URL.parse().map_err(|e| e.to_string())?);
    WebviewWindowBuilder::new(&app, "site", url)
        .title("CooperWeb")
        .inner_size(1280.0, 820.0)
        .min_inner_size(900.0, 600.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_site])
        .run(tauri::generate_context!())
        .expect("error while running CooperWeb client");
}
