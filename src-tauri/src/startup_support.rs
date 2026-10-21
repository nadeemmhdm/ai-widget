use chrono::Utc;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

pub fn startup_log_path() -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("Nook AI Pet").join("logs").join("startup.log")
}

pub fn log(message: impl AsRef<str>) {
    let path = startup_log_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "[{}] {}", Utc::now().to_rfc3339(), message.as_ref());
    }
}

#[cfg(windows)]
pub fn show_fatal_error(message: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

    let title: Vec<u16> = "Nook AI Pet\0".encode_utf16().collect();
    let body = format!(
        "Nook AI Pet could not start.\n\n{}\n\nDiagnostic log:\n{}",
        message,
        startup_log_path().display()
    );
    let body: Vec<u16> = body.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        MessageBoxW(std::ptr::null_mut(), body.as_ptr(), title.as_ptr(), MB_OK | MB_ICONERROR);
    }
}

#[cfg(not(windows))]
pub fn show_fatal_error(message: &str) {
    eprintln!("Nook AI Pet could not start: {message}");
}
