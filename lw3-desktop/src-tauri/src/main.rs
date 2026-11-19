// Программа «Показатель адиабаты»: окно с интерфейсом из dist/ и команды для него —
// сохранить файл / PDF через стандартное окно Windows, общая папка для сдачи работ,
// масштаб интерфейса, полный экран, настройки рядом с программой, ссылка на новую версию.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

fn pick_save(app: &tauri::AppHandle, name: &str, ext: &str, label: &str) -> Result<Option<PathBuf>, String> {
    let picked = app.dialog().file().set_file_name(name).add_filter(label, &[ext]).blocking_save_file();
    match picked {
        None => Ok(None),
        Some(f) => f.into_path().map(Some).map_err(|e| e.to_string()),
    }
}

/// Окно «Сохранить как»; пишет текст в выбранный файл. None — пользователь отменил.
#[tauri::command]
async fn save_file(app: tauri::AppHandle, name: String, contents: String, ext: String, label: String) -> Result<Option<String>, String> {
    let Some(path) = pick_save(&app, &name, &ext, &label)? else { return Ok(None) };
    std::fs::write(&path, contents.as_bytes()).map_err(|e| format!("{}: {}", path.display(), e))?;
    Ok(Some(path.display().to_string()))
}

/// Окно «Сохранить как» → PDF из текущей страницы (печатная версия: только отчёт).
#[tauri::command]
async fn save_pdf(app: tauri::AppHandle, window: tauri::WebviewWindow, name: String) -> Result<Option<String>, String> {
    let Some(path) = pick_save(&app, &name, "pdf", "PDF")? else { return Ok(None) };
    print_pdf(&window, path.display().to_string())?;
    Ok(Some(path.display().to_string()))
}

#[cfg(windows)]
fn print_pdf(window: &tauri::WebviewWindow, path: String) -> Result<(), String> {
    use webview2_com::{Microsoft::Web::WebView2::Win32::{ICoreWebView2PrintSettings, ICoreWebView2_7}, PrintToPdfCompletedHandler};
    use windows::core::{Interface, HSTRING};
    let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
    let tx_err = tx.clone();
    window
        .with_webview(move |wv| {
            let started = (|| -> Result<(), String> {
                unsafe {
                    let core = wv.controller().CoreWebView2().map_err(|e| e.to_string())?;
                    let core7: ICoreWebView2_7 = core.cast().map_err(|e| e.to_string())?;
                    let handler = PrintToPdfCompletedHandler::create(Box::new(move |hr, ok| {
                        let _ = tx.send(match hr {
                            Ok(()) if ok => Ok(()),
                            Ok(()) => Err("PDF не создан".into()),
                            Err(e) => Err(e.to_string()),
                        });
                        Ok(())
                    }));
                    core7.PrintToPdf(&HSTRING::from(path.as_str()), None::<&ICoreWebView2PrintSettings>, &handler).map_err(|e| e.to_string())
                }
            })();
            if let Err(e) = started {
                let _ = tx_err.send(Err(e));
            }
        })
        .map_err(|e| e.to_string())?;
    rx.recv_timeout(std::time::Duration::from_secs(90)).map_err(|_| "нет ответа от WebView2".to_string())?
}

#[cfg(not(windows))]
fn print_pdf(_window: &tauri::WebviewWindow, _path: String) -> Result<(), String> {
    Err("Сохранение PDF напрямую есть только в Windows".into())
}

/// Выбор папки (общая папка класса для сдачи работ).
#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    match app.dialog().file().blocking_pick_folder() {
        None => Ok(None),
        Some(f) => f.into_path().map(|p| Some(p.display().to_string())).map_err(|e| e.to_string()),
    }
}

fn safe_lw3_name(name: &str) -> Result<&str, String> {
    let ok = name.ends_with(".lw3") && !name.contains(['/', '\\', ':']) && !name.starts_with('.') && name.len() < 200;
    if ok { Ok(name) } else { Err("недопустимое имя файла".into()) }
}

/// Записать файл работы (.lw3) в папку сдачи.
#[tauri::command]
async fn write_lw3(dir: String, name: String, contents: String) -> Result<String, String> {
    let path = Path::new(&dir).join(safe_lw3_name(&name)?);
    std::fs::write(&path, contents.as_bytes()).map_err(|e| format!("{}: {}", path.display(), e))?;
    Ok(path.display().to_string())
}

/// Прочитать все файлы работ (.lw3) из папки: [(имя, содержимое)].
#[tauri::command]
async fn read_lw3_dir(dir: String) -> Result<Vec<(String, String)>, String> {
    let mut out = Vec::new();
    for e in std::fs::read_dir(&dir).map_err(|e| format!("{}: {}", dir, e))?.flatten() {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if !name.to_lowercase().ends_with(".lw3") || !p.is_file() { continue; }
        if e.metadata().map(|m| m.len() > 4_000_000).unwrap_or(true) { continue; }
        if let Ok(s) = std::fs::read_to_string(&p) { out.push((name, s)); }
        if out.len() >= 1000 { break; }
    }
    Ok(out)
}

/// Настройки рядом с программой: adiabata.json в папке .exe (например, общая папка класса для всех компьютеров).
#[tauri::command]
fn app_config() -> Option<String> {
    let exe = std::env::current_exe().ok()?;
    std::fs::read_to_string(exe.parent()?.join("adiabata.json")).ok()
}

#[tauri::command]
fn set_zoom(window: tauri::WebviewWindow, scale: f64) -> Result<(), String> {
    window.set_zoom(scale.clamp(0.6, 2.0)).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!full).map_err(|e| e.to_string())
}

/// Открыть страницу загрузки новой версии в браузере (только ссылки на релизы программы).
#[tauri::command]
fn open_release(url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/vitalya2078-cloud/vitalya2078-cloud.github.io/releases") {
        return Err("ссылка не разрешена".into());
    }
    #[cfg(windows)]
    let r = std::process::Command::new("explorer").arg(&url).spawn();
    #[cfg(not(windows))]
    let r = std::process::Command::new("xdg-open").arg(&url).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_file, save_pdf, pick_folder, write_lw3, read_lw3_dir, app_config, set_zoom, toggle_fullscreen, open_release
        ])
        .run(tauri::generate_context!())
        .expect("не удалось запустить программу");
}
