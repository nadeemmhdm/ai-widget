use crate::db::{Database, ScheduledItem};
use chrono::{DateTime, Utc};
use tauri::{AppHandle, Emitter};

pub fn create_timer(db: &Database, label: &str, duration_seconds: i64) -> Result<ScheduledItem, String> {
    if !(1..=31_536_000).contains(&duration_seconds) {
        return Err("Timer duration must be between 1 second and 365 days.".into());
    }
    let due = Utc::now().timestamp_millis() + duration_seconds * 1000;
    db.create_scheduled("timer", label, due)
}

pub fn create_reminder(db: &Database, label: &str, due_at: &str) -> Result<ScheduledItem, String> {
    let parsed = DateTime::parse_from_rfc3339(due_at)
        .map_err(|_| "Reminder dueAt must be an RFC3339 date/time including timezone.".to_string())?;
    db.create_scheduled("reminder", label, parsed.timestamp_millis())
}

pub fn start_scheduler(app: AppHandle, db: Database) {
    tauri::async_runtime::spawn(async move {
        // Give the frontend time to register its event listener before replaying overdue jobs.
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        loop {
            let now = Utc::now().timestamp_millis();
            if let Ok(items) = db.take_due(now) {
                for item in items {
                    let _ = app.emit("schedule-fired", item);
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
    });
}
