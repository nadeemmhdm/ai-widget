mod ai_agent;
mod db;
mod scheduler;
mod power;
mod secrets;
mod system_tools;

use ai_agent::{AgentRequest, AgentResponse};
use db::{Database, Note, ScheduledItem, Todo};
use system_tools::{AppResult, FileResult};
use power::PowerStatus;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

#[derive(Clone)]
struct AppState {
    db: Database,
}

fn configured_file_roots(db: &Database) -> Vec<std::path::PathBuf> {
    let configured = db.get_setting("allowed_file_roots")
        .ok()
        .flatten()
        .and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok())
        .unwrap_or_default();
    let roots = system_tools::normalize_allowed_roots(&configured);
    if roots.is_empty() { system_tools::default_file_roots() } else { roots }
}

#[tauri::command]
async fn assistant_run(request: AgentRequest, state: tauri::State<'_, AppState>) -> Result<AgentResponse, String> {
    ai_agent::run_agent(request, state.db.clone()).await
}

#[tauri::command]
fn add_note(text: String, state: tauri::State<'_, AppState>) -> Result<Note, String> {
    state.db.add_note(&text)
}

#[tauri::command]
fn list_notes(limit: Option<usize>, state: tauri::State<'_, AppState>) -> Result<Vec<Note>, String> {
    state.db.list_notes(limit.unwrap_or(20))
}

#[tauri::command]
fn search_notes(query: String, limit: Option<usize>, state: tauri::State<'_, AppState>) -> Result<Vec<Note>, String> {
    state.db.search_notes(&query, limit.unwrap_or(20))
}

#[tauri::command]
fn delete_note(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.delete_note(&id)
}

#[tauri::command]
fn add_todo(text: String, due_at: Option<String>, state: tauri::State<'_, AppState>) -> Result<Todo, String> {
    state.db.add_todo(&text, due_at)
}

#[tauri::command]
fn list_todos(include_done: Option<bool>, limit: Option<usize>, state: tauri::State<'_, AppState>) -> Result<Vec<Todo>, String> {
    state.db.list_todos(include_done.unwrap_or(false), limit.unwrap_or(50))
}

#[tauri::command]
fn complete_todo(id_or_text: String, state: tauri::State<'_, AppState>) -> Result<Todo, String> {
    state.db.complete_todo(&id_or_text)
}

#[tauri::command]
fn delete_todo(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.delete_todo(&id)
}

#[tauri::command]
fn create_timer(label: String, duration_seconds: i64, state: tauri::State<'_, AppState>) -> Result<ScheduledItem, String> {
    scheduler::create_timer(&state.db, &label, duration_seconds)
}

#[tauri::command]
fn create_reminder(label: String, due_at: String, state: tauri::State<'_, AppState>) -> Result<ScheduledItem, String> {
    scheduler::create_reminder(&state.db, &label, &due_at)
}

#[tauri::command]
fn list_scheduled(include_finished: Option<bool>, state: tauri::State<'_, AppState>) -> Result<Vec<ScheduledItem>, String> {
    state.db.list_scheduled(include_finished.unwrap_or(false), 100)
}

#[tauri::command]
fn cancel_scheduled(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.cancel_scheduled(&id)
}

#[tauri::command]
fn search_files(query: String, limit: Option<usize>, state: tauri::State<'_, AppState>) -> Vec<FileResult> {
    let roots = configured_file_roots(&state.db);
    system_tools::search_files_impl(&query, limit.unwrap_or(12), &roots)
}

#[tauri::command]
fn open_file(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let roots = configured_file_roots(&state.db);
    system_tools::open_file_impl(&path, &roots)
}

#[tauri::command]
fn get_allowed_file_roots(state: tauri::State<'_, AppState>) -> Vec<String> {
    system_tools::display_paths(&configured_file_roots(&state.db))
}

#[tauri::command]
fn set_allowed_file_roots(roots: Vec<String>, state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    if roots.len() > 12 { return Err("A maximum of 12 allowed folders is supported.".into()); }
    let normalized = system_tools::normalize_allowed_roots(&roots);
    if normalized.is_empty() { return Err("At least one existing folder must remain allowed.".into()); }
    let display = system_tools::display_paths(&normalized);
    state.db.set_setting("allowed_file_roots", &serde_json::to_string(&display).map_err(|e| e.to_string())?)?;
    Ok(display)
}

#[tauri::command]
fn search_apps(query: String, limit: Option<usize>) -> Vec<AppResult> {
    let mut results = system_tools::search_apps_impl(&query, limit.unwrap_or(12));
    results.truncate(limit.unwrap_or(12).clamp(1, 30));
    results
}

#[tauri::command]
fn launch_app(name: String) -> Result<AppResult, String> {
    system_tools::launch_app_by_name_impl(&name)
}

#[tauri::command]
fn set_cloud_api_key(api_key: String) -> Result<(), String> {
    secrets::set_cloud_api_key_value(&api_key)
}

#[tauri::command]
fn has_cloud_api_key() -> bool {
    secrets::has_cloud_api_key_value()
}

#[tauri::command]
fn delete_cloud_api_key() -> Result<(), String> {
    secrets::delete_cloud_api_key_value()
}

#[tauri::command]
fn system_power_status() -> Result<PowerStatus, String> {
    power::read_power_status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;
                app.handle().plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))?;
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                if !app.autolaunch().is_enabled().unwrap_or(false) {
                    let _ = app.autolaunch().enable();
                }
            }

            let app_data = app.path().app_data_dir()?;
            let db = Database::new(db::database_path(&app_data));
            db.init().map_err(std::io::Error::other)?;
            app.manage(AppState { db: db.clone() });
            scheduler::start_scheduler(app.handle().clone(), db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            assistant_run,
            add_note,
            list_notes,
            search_notes,
            delete_note,
            add_todo,
            list_todos,
            complete_todo,
            delete_todo,
            create_timer,
            create_reminder,
            list_scheduled,
            cancel_scheduled,
            search_files,
            open_file,
            get_allowed_file_roots,
            set_allowed_file_roots,
            search_apps,
            launch_app,
            set_cloud_api_key,
            has_cloud_api_key,
            delete_cloud_api_key,
            system_power_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nook AI Pet");
}
