use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Clone)]
pub struct Database {
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub text: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub created_at: String,
    pub due_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledItem {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub due_at_ms: i64,
    pub status: String,
    pub created_at: String,
}

impl Database {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    fn open(&self) -> Result<Connection, String> {
        Connection::open(&self.path).map_err(|e| e.to_string())
    }

    pub fn init(&self) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let conn = self.open()?;
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                due_at TEXT
            );
            CREATE TABLE IF NOT EXISTS scheduled (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL CHECK(kind IN ('timer','reminder')),
                label TEXT NOT NULL,
                due_at_ms INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fired','cancelled')),
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_todos_done_created ON todos(done, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_scheduled_due ON scheduled(status, due_at_ms);
            "#,
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.open()?;
        conn.query_row("SELECT value FROM settings WHERE key=?1", params![key], |row| row.get(0))
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.open()?;
        conn.execute(
            "INSERT INTO settings(key,value,updated_at) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            params![key, value, Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn add_note(&self, text: &str) -> Result<Note, String> {
        let text = text.trim();
        if text.is_empty() {
            return Err("Note cannot be empty.".into());
        }
        let note = Note {
            id: Uuid::new_v4().to_string(),
            text: text.to_string(),
            created_at: Utc::now().to_rfc3339(),
        };
        let conn = self.open()?;
        conn.execute(
            "INSERT INTO notes(id,text,created_at) VALUES (?1,?2,?3)",
            params![note.id, note.text, note.created_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(note)
    }

    pub fn list_notes(&self, limit: usize) -> Result<Vec<Note>, String> {
        let conn = self.open()?;
        let mut stmt = conn
            .prepare("SELECT id,text,created_at FROM notes ORDER BY created_at DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit.min(100) as i64], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_note(&self, id: &str) -> Result<(), String> {
        let conn = self.open()?;
        let changed = conn
            .execute("DELETE FROM notes WHERE id=?1", params![id])
            .map_err(|e| e.to_string())?;
        if changed == 0 {
            return Err("Note not found.".into());
        }
        Ok(())
    }

    pub fn search_notes(&self, query: &str, limit: usize) -> Result<Vec<Note>, String> {
        let pattern = format!("%{}%", query.trim());
        let conn = self.open()?;
        let mut stmt = conn
            .prepare("SELECT id,text,created_at FROM notes WHERE text LIKE ?1 ORDER BY created_at DESC LIMIT ?2")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![pattern, limit.min(100) as i64], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn add_todo(&self, text: &str, due_at: Option<String>) -> Result<Todo, String> {
        let text = text.trim();
        if text.is_empty() {
            return Err("Todo cannot be empty.".into());
        }
        if let Some(ref due) = due_at {
            DateTime::parse_from_rfc3339(due).map_err(|_| "Todo dueAt must be RFC3339.".to_string())?;
        }
        let todo = Todo {
            id: Uuid::new_v4().to_string(),
            text: text.to_string(),
            done: false,
            created_at: Utc::now().to_rfc3339(),
            due_at,
        };
        let conn = self.open()?;
        conn.execute(
            "INSERT INTO todos(id,text,done,created_at,due_at) VALUES (?1,?2,0,?3,?4)",
            params![todo.id, todo.text, todo.created_at, todo.due_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(todo)
    }

    pub fn list_todos(&self, include_done: bool, limit: usize) -> Result<Vec<Todo>, String> {
        let conn = self.open()?;
        let sql = if include_done {
            "SELECT id,text,done,created_at,due_at FROM todos ORDER BY done ASC, created_at DESC LIMIT ?1"
        } else {
            "SELECT id,text,done,created_at,due_at FROM todos WHERE done=0 ORDER BY created_at DESC LIMIT ?1"
        };
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit.min(200) as i64], |row| {
                Ok(Todo {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    done: row.get::<_, i64>(2)? != 0,
                    created_at: row.get(3)?,
                    due_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_todo(&self, id: &str) -> Result<(), String> {
        let conn = self.open()?;
        let changed = conn
            .execute("DELETE FROM todos WHERE id=?1", params![id])
            .map_err(|e| e.to_string())?;
        if changed == 0 {
            return Err("Todo not found.".into());
        }
        Ok(())
    }

    pub fn complete_todo(&self, id_or_query: &str) -> Result<Todo, String> {
        let needle = id_or_query.trim();
        if needle.is_empty() {
            return Err("Todo identifier cannot be empty.".into());
        }
        let conn = self.open()?;
        let pattern = format!("%{}%", needle);
        let found: Option<Todo> = conn
            .query_row(
                "SELECT id,text,done,created_at,due_at FROM todos WHERE done=0 AND (id=?1 OR text LIKE ?2) ORDER BY created_at DESC LIMIT 1",
                params![needle, pattern],
                |row| {
                    Ok(Todo {
                        id: row.get(0)?,
                        text: row.get(1)?,
                        done: row.get::<_, i64>(2)? != 0,
                        created_at: row.get(3)?,
                        due_at: row.get(4)?,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())?;
        let mut todo = found.ok_or_else(|| "No matching open todo was found.".to_string())?;
        conn.execute("UPDATE todos SET done=1 WHERE id=?1", params![todo.id])
            .map_err(|e| e.to_string())?;
        todo.done = true;
        Ok(todo)
    }

    pub fn create_scheduled(&self, kind: &str, label: &str, due_at_ms: i64) -> Result<ScheduledItem, String> {
        if kind != "timer" && kind != "reminder" {
            return Err("Scheduled item kind must be timer or reminder.".into());
        }
        if due_at_ms <= Utc::now().timestamp_millis() {
            return Err("Scheduled time must be in the future.".into());
        }
        let item = ScheduledItem {
            id: Uuid::new_v4().to_string(),
            kind: kind.to_string(),
            label: if label.trim().is_empty() { "Reminder".into() } else { label.trim().to_string() },
            due_at_ms,
            status: "pending".into(),
            created_at: Utc::now().to_rfc3339(),
        };
        let conn = self.open()?;
        conn.execute(
            "INSERT INTO scheduled(id,kind,label,due_at_ms,status,created_at) VALUES (?1,?2,?3,?4,'pending',?5)",
            params![item.id, item.kind, item.label, item.due_at_ms, item.created_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(item)
    }

    pub fn list_scheduled(&self, include_finished: bool, limit: usize) -> Result<Vec<ScheduledItem>, String> {
        let conn = self.open()?;
        let sql = if include_finished {
            "SELECT id,kind,label,due_at_ms,status,created_at FROM scheduled ORDER BY due_at_ms ASC LIMIT ?1"
        } else {
            "SELECT id,kind,label,due_at_ms,status,created_at FROM scheduled WHERE status='pending' ORDER BY due_at_ms ASC LIMIT ?1"
        };
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit.min(200) as i64], |row| {
                Ok(ScheduledItem {
                    id: row.get(0)?,
                    kind: row.get(1)?,
                    label: row.get(2)?,
                    due_at_ms: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn cancel_scheduled(&self, id: &str) -> Result<(), String> {
        let conn = self.open()?;
        let changed = conn
            .execute("UPDATE scheduled SET status='cancelled' WHERE id=?1 AND status='pending'", params![id])
            .map_err(|e| e.to_string())?;
        if changed == 0 {
            return Err("Pending timer/reminder not found.".into());
        }
        Ok(())
    }

    pub fn take_due(&self, now_ms: i64) -> Result<Vec<ScheduledItem>, String> {
        let mut conn = self.open()?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let items = {
            let mut stmt = tx
                .prepare("SELECT id,kind,label,due_at_ms,status,created_at FROM scheduled WHERE status='pending' AND due_at_ms <= ?1 ORDER BY due_at_ms ASC LIMIT 25")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![now_ms], |row| {
                    Ok(ScheduledItem {
                        id: row.get(0)?,
                        kind: row.get(1)?,
                        label: row.get(2)?,
                        due_at_ms: row.get(3)?,
                        status: "fired".into(),
                        created_at: row.get(5)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
        };
        for item in &items {
            tx.execute("UPDATE scheduled SET status='fired' WHERE id=?1", params![item.id])
                .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(items)
    }
}

pub fn database_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("nook.sqlite3")
}
