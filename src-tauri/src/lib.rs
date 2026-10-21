mod ai_agent;
mod db;
mod power;
mod scheduler;
mod secrets;
mod startup_support;
mod system_tools;

use ai_agent::{AgentRequest, AgentResponse};
use db::{Database, Note, ScheduledItem, Todo};
use power::PowerStatus;
use std::path::PathBuf;
use system_tools::{AppResult, FileResult};
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

#[derive(Clone)]
struct AppState {
    db: Database,
}

fn configured_file_roots(db: &Database) -> Vec<std::path::PathBuf> {
    let configured = db
        .get_setting("allowed_file_roots")
        .ok()
        .flatten()
        .and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok())
        .unwrap_or_default();
    let roots = system_tools::normalize_allowed_roots(&configured);
    if roots.is_empty() {
        system_tools::default_file_roots()
    } else {
        roots
    }
}

fn prepare_database(preferred_dir: PathBuf) -> Result<Database, String> {
    let primary_path = db::database_path(&preferred_dir);
    let primary = Database::new(primary_path.clone());

    match primary.init() {
        Ok(()) => return Ok(primary),
        Err(first_error) => {
            startup_support::log(format!("Primary database init failed: {first_error}"));
        }
    }

    if primary_path.exists() {
        let backup = primary_path.with_extension(format!(
            "sqlite3.bad-{}",
            chrono::Utc::now().timestamp()
        ));
        match std::fs::rename(&primary_path, &backup) {
            Ok(()) => startup_support::log(format!(
                "Backed up unreadable database to {}",
                backup.display()
            )),
            Err(error) => startup_support::log(format!(
                "Could not back up unreadable database: {error}"
            )),
        }
    }

    match primary.init() {
        Ok(()) => {
            startup_support::log("Database recovered successfully after backup.");
            return Ok(primary);
        }
        Err(second_error) => startup_support::log(format!(
            "Primary database retry failed: {second_error}"
        )),
    }

    let fallback_dir = std::env::temp_dir().join("nook-ai-pet");
    let fallback = Database::new(db::database_path(&fallback_dir));
    fallback.init().map_err(|fallback_error| {
        format!(
            "Database startup failed in both app-data and fallback locations: {fallback_error}"
        )
    })?;
    startup_support::log(format!(
        "Using temporary fallback database at {}",
        fallback.path.display()
    ));
    Ok(fallback)
}

#[tauri::command]
async fn assistant_run(
    request: AgentRequest,
    state: tauri::State<'_, AppState>,
) -> Result<AgentResponse, String> {
    ai_agent::run_agent(request, state.db.clone()).await
}

#[tauri::command]
fn add_note(text: String, state: tauri::State<'_, AppState>) -> Result<Note, String> {
    state.db.add_note(&text)
}

#[tauri::command]
fn list_notes(
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Note>, String> {
    state.db.list_notes(limit.unwrap_or(20))
}

#[tauri::command]
fn search_notes(
    query: String,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Note>, String> {
    state.db.search_notes(&query, limit.unwrap_or(20))
}

#[tauri::command]
fn delete_note(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.delete_note(&id)
}

#[tauri::command]
fn add_todo(
    text: String,
    due_at: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Todo, String> {
    state.db.add_todo(&text, due_at)
}

#[tauri::command]
fn list_todos(
    include_done: Option<bool>,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Todo>, String> {
    state
        .db
        .list_todos(include_done.unwrap_or(false), limit.unwrap_or(50))
}

#[tauri::command]
fn complete_todo(
    id_or_text: String,
    state: tauri::State<'_, AppState>,
) -> Result<Todo, String> {
    state.db.complete_todo(&id_or_text)
}

#[tauri::command]
fn delete_todo(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.delete_todo(&id)
}

#[tauri::command]
fn create_timer(
    label: String,
    duration_seconds: i64,
    state: tauri::State<'_, AppState>,
) -> Result<ScheduledItem, String> {
    scheduler::create_timer(&state.db, &label, duration_seconds)
}

#[tauri::command]
fn create_reminder(
    label: String,
    due_at: String,
    state: tauri::State<'_, AppState>,
) -> Result<ScheduledItem, String> {
    scheduler::create_reminder(&state.db, &label, &due_at)
}

#[tauri::command]
fn list_scheduled(
    include_finished: Option<bool>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ScheduledItem>, String> {
    state
        .db
        .list_scheduled(include_finished.unwrap_or(false), 100)
}

#[tauri::command]
fn cancel_scheduled(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.db.cancel_scheduled(&id)
}

#[tauri::command]
fn search_files(
    query: String,
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Vec<FileResult> {
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
fn set_allowed_file_roots(
    roots: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    if roots.len() > 12 {
        return Err("A maximum of 12 allowed folders is supported.".into());
    }
    let normalized = system_tools::normalize_allowed_roots(&roots);
    if normalized.is_empty() {
        return Err("At least one existing folder must remain allowed.".into());
    }
    let display = system_tools::display_paths(&normalized);
    state.db.set_setting(
        "allowed_file_roots",
        &serde_json::to_string(&display).map_err(|e| e.to_string())?,
    )?;
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
    let result = tauri::Builder::default()
        .setup(|app| {
            startup_support::log("Starting Nook AI Pet v1.0.1.");

            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;

                let autostart_ready = match app.handle().plugin(
                    tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None),
                ) {
                    Ok(()) => true,
                    Err(error) => {
                        startup_support::log(format!(
                            "Autostart plugin initialization failed; continuing without it: {error}"
                        ));
                        false
                    }
                };

                if autostart_ready {
                    match app.autolaunch().is_enabled() {
                        Ok(false) => {
                            if let Err(error) = app.autolaunch().enable() {
                                startup_support::log(format!(
                                    "Could not enable autostart; continuing: {error}"
                                ));
                            }
                        }
                        Ok(true) => {}
                        Err(error) => startup_support::log(format!(
                            "Could not read autostart state; continuing: {error}"
                        )),
                    }
                }

                if let Err(error) = app
                    .handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())
                {
                    startup_support::log(format!(
                        "Updater plugin initialization failed; continuing without updater: {error}"
                    ));
                }
            }

            let app_data = match app.path().app_data_dir() {
                Ok(path) => path,
                Err(error) => {
                    startup_support::log(format!(
                        "Could not resolve app data directory; using temporary location: {error}"
                    ));
                    std::env::temp_dir().join("nook-ai-pet")
                }
            };

            let db = prepare_database(app_data).map_err(std::io::Error::other)?;
            app.manage(AppState { db: db.clone() });
            scheduler::start_scheduler(app.handle().clone(), db);
            startup_support::log("Startup initialization completed successfully.");
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
        .run(tauri::generate_context!());

    if let Err(error) = result {
        let message = format!("Native runtime error: {error}");
        startup_support::log(&message);
        startup_support::show_fatal_error(&message);
    }
}
