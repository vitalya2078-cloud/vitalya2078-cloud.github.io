// Программа «ЛР № 3 · Показатель адиабаты»: окно с интерфейсом из dist/ и две команды —
// сохранить файл через стандартное окно Windows и переключить полный экран.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_dialog::DialogExt;

/// Окно «Сохранить как»; пишет текст в выбранный файл. None — пользователь отменил.
#[tauri::command]
async fn save_file(app: tauri::AppHandle, name: String, contents: String, ext: String, label: String) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name(&name)
        .add_filter(&label, &[ext.as_str()])
        .blocking_save_file();
    let Some(file) = picked else { return Ok(None) };
    let path = file.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, contents.as_bytes()).map_err(|e| format!("{}: {}", path.display(), e))?;
    Ok(Some(path.display().to_string()))
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!full).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file, toggle_fullscreen])
        .run(tauri::generate_context!())
        .expect("не удалось запустить программу");
}
