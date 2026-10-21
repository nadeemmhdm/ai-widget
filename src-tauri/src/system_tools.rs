use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileResult {
    pub name: String,
    pub path: String,
    pub parent: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppResult {
    pub name: String,
    pub path: String,
    pub source: String,
}

fn unique_existing(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();
    for path in paths {
        if path.exists() && !out.iter().any(|p| p == &path) {
            out.push(path);
        }
    }
    out
}

pub fn default_file_roots() -> Vec<PathBuf> {
    let home = dirs::home_dir();
    let mut roots = Vec::new();
    if let Some(home) = home {
        for child in ["Desktop", "Documents", "Downloads", "Pictures", "Videos", "Music"] {
            roots.push(home.join(child));
        }
    }
    unique_existing(roots)
}

pub fn normalize_allowed_roots(configured: &[String]) -> Vec<PathBuf> {
    let candidates = configured.iter().filter_map(|raw| {
        let path = PathBuf::from(raw.trim());
        if raw.trim().is_empty() || !path.is_dir() { return None; }
        path.canonicalize().ok()
    }).collect::<Vec<_>>();
    unique_existing(candidates)
}

pub fn display_paths(paths: &[PathBuf]) -> Vec<String> {
    paths.iter().map(|p| p.display().to_string()).collect()
}

fn start_menu_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        roots.push(PathBuf::from(appdata).join("Microsoft/Windows/Start Menu/Programs"));
    }
    if let Ok(programdata) = std::env::var("PROGRAMDATA") {
        roots.push(PathBuf::from(programdata).join("Microsoft/Windows/Start Menu/Programs"));
    }
    unique_existing(roots)
}

pub fn search_files_impl(query: &str, limit: usize, roots: &[PathBuf]) -> Vec<FileResult> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Vec::new();
    }
    let max_results = limit.clamp(1, 50);
    let mut results = Vec::new();
    let mut scanned = 0usize;
    for root in roots {
        for entry in WalkDir::new(&root).max_depth(7).follow_links(false).into_iter().filter_map(Result::ok) {
            scanned += 1;
            if scanned > 60_000 || results.len() >= max_results {
                break;
            }
            if !entry.file_type().is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.to_lowercase().contains(&needle) {
                continue;
            }
            let path = entry.path().to_path_buf();
            results.push(FileResult {
                name,
                parent: path.parent().map(|p| p.display().to_string()).unwrap_or_default(),
                path: path.display().to_string(),
            });
        }
        if results.len() >= max_results || scanned > 60_000 {
            break;
        }
    }
    results
}

fn is_path_inside(path: &Path, roots: &[PathBuf]) -> bool {
    let Ok(canonical) = path.canonicalize() else { return false; };
    roots.iter().any(|root| root.canonicalize().map(|r| canonical.starts_with(r)).unwrap_or(false))
}

#[cfg(target_os = "windows")]
fn shell_open(path: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let operation: Vec<u16> = std::ffi::OsStr::new("open").encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = std::ffi::OsStr::new(path).encode_wide().chain(Some(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            target.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    } as isize;
    if result <= 32 {
        Err(format!("Windows could not open the target (ShellExecute code {result})."))
    } else {
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
fn shell_open(_path: &str) -> Result<(), String> {
    Err("Opening files/apps is enabled in the Windows build.".into())
}

pub fn open_file_impl(path: &str, roots: &[PathBuf]) -> Result<(), String> {
    let candidate = PathBuf::from(path);
    if !candidate.is_file() || !is_path_inside(&candidate, roots) {
        return Err("The file must be inside a folder explicitly allowed in Nook settings.".into());
    }
    shell_open(&candidate.display().to_string())
}

fn system_apps() -> Vec<AppResult> {
    vec![
        AppResult { name: "Calculator".into(), path: "calc.exe".into(), source: "Windows".into() },
        AppResult { name: "Notepad".into(), path: "notepad.exe".into(), source: "Windows".into() },
        AppResult { name: "File Explorer".into(), path: "explorer.exe".into(), source: "Windows".into() },
        AppResult { name: "Windows Settings".into(), path: "ms-settings:".into(), source: "Windows".into() },
    ]
}

fn normalize_app_query(query: &str) -> String {
    let lower = query.trim().to_lowercase();
    match lower.as_str() {
        "vs code" | "vscode" | "code" => "visual studio code".into(),
        "file manager" => "file explorer".into(),
        _ => lower,
    }
}

fn app_name_matches(name: &str, query: &str) -> bool {
    let name_lower = name.to_lowercase();
    let normalized = normalize_app_query(query);
    if name_lower.contains(&normalized) { return true; }
    let tokens: Vec<&str> = normalized.split_whitespace().collect();
    if !tokens.is_empty() && tokens.iter().all(|token| name_lower.contains(token)) { return true; }
    let acronym: String = name_lower.split_whitespace().filter_map(|w| w.chars().next()).collect();
    let compact: String = normalized.chars().filter(|c| !c.is_whitespace()).collect();
    acronym.starts_with(&compact) || compact.starts_with(&acronym)
}

pub fn search_apps_impl(query: &str, limit: usize) -> Vec<AppResult> {
    let needle = normalize_app_query(query);
    if needle.is_empty() {
        return Vec::new();
    }
    let max_results = limit.clamp(1, 30);
    let mut results: Vec<AppResult> = system_apps()
        .into_iter()
        .filter(|app| app_name_matches(&app.name, &needle))
        .collect();

    for root in start_menu_roots() {
        for entry in WalkDir::new(&root).max_depth(6).follow_links(false).into_iter().filter_map(Result::ok) {
            if results.len() >= max_results {
                break;
            }
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("lnk")) != Some(true) {
                continue;
            }
            let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or_default().to_string();
            if !app_name_matches(&name, &needle) {
                continue;
            }
            results.push(AppResult {
                name,
                path: path.display().to_string(),
                source: "Start Menu".into(),
            });
        }
    }
    results.truncate(max_results);
    results
}

pub fn launch_app_by_name_impl(name: &str) -> Result<AppResult, String> {
    let query = name.trim();
    if query.is_empty() {
        return Err("App name cannot be empty.".into());
    }
    let lower = query.to_lowercase();
    if lower == "calculator" || lower == "calc" {
        Command::new("calc.exe").spawn().map_err(|e| e.to_string())?;
        return Ok(system_apps()[0].clone());
    }
    if lower == "notepad" {
        Command::new("notepad.exe").spawn().map_err(|e| e.to_string())?;
        return Ok(system_apps()[1].clone());
    }
    if lower == "explorer" || lower == "file explorer" {
        Command::new("explorer.exe").spawn().map_err(|e| e.to_string())?;
        return Ok(system_apps()[2].clone());
    }
    if lower == "settings" || lower == "windows settings" {
        Command::new("explorer.exe").arg("ms-settings:").spawn().map_err(|e| e.to_string())?;
        return Ok(system_apps()[3].clone());
    }

    let results = search_apps_impl(query, 8);
    let app = results
        .into_iter()
        .min_by_key(|app| if app.name.eq_ignore_ascii_case(query) { 0 } else { 1 })
        .ok_or_else(|| format!("No installed app matching “{query}” was found in the Start Menu."))?;
    let candidate = PathBuf::from(&app.path);
    if !is_path_inside(&candidate, &start_menu_roots()) || candidate.extension().and_then(|e| e.to_str()).map(|e| !e.eq_ignore_ascii_case("lnk")).unwrap_or(true) {
        return Err("Refusing to launch an untrusted app target.".into());
    }
    shell_open(&app.path)?;
    Ok(app)
}
