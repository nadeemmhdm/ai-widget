use crate::db::Database;
use crate::{scheduler, secrets, system_tools};
use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRequest {
    pub prompt: String,
    pub mode: String,
    pub local_model: String,
    pub cloud_model: String,
    pub character: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEffect {
    pub kind: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentResponse {
    pub message: String,
    pub effects: Vec<AgentEffect>,
    pub tools_used: Vec<String>,
    pub provider: String,
}

async fn call_chat(host: &str, model: &str, messages: &[Value], tools: &[Value], api_key: Option<&str>) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())?;
    let payload = json!({
        "model": model,
        "messages": messages,
        "tools": tools,
        "stream": false
    });
    let mut request = client.post(format!("{host}/api/chat")).json(&payload);
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key.trim());
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Ollama returned {status}: {text}"));
    }
    let body: Value = response.json().await.map_err(|e| e.to_string())?;
    body.get("message").cloned().ok_or_else(|| "Ollama response did not include a message.".into())
}

async fn choose_provider(request: &AgentRequest, messages: &[Value], tools: &[Value]) -> Result<(Value, String), String> {
    match request.mode.as_str() {
        "local" => Ok((call_chat("http://127.0.0.1:11434", request.local_model.trim(), messages, tools, None).await?, "local".into())),
        "cloud" => {
            let key = secrets::get_cloud_api_key_value().ok_or_else(|| "Ollama Cloud API key is not configured.".to_string())?;
            Ok((call_chat("https://ollama.com", request.cloud_model.trim(), messages, tools, Some(&key)).await?, "cloud".into()))
        }
        _ => {
            if let Some(key) = secrets::get_cloud_api_key_value() {
                if let Ok(message) = call_chat("https://ollama.com", request.cloud_model.trim(), messages, tools, Some(&key)).await {
                    return Ok((message, "cloud".into()));
                }
            }
            Ok((call_chat("http://127.0.0.1:11434", request.local_model.trim(), messages, tools, None).await?, "local".into()))
        }
    }
}

async fn call_same_provider(provider: &str, request: &AgentRequest, messages: &[Value], tools: &[Value]) -> Result<Value, String> {
    if provider == "cloud" {
        let key = secrets::get_cloud_api_key_value().ok_or_else(|| "Ollama Cloud API key is not configured.".to_string())?;
        call_chat("https://ollama.com", request.cloud_model.trim(), messages, tools, Some(&key)).await
    } else {
        call_chat("http://127.0.0.1:11434", request.local_model.trim(), messages, tools, None).await
    }
}

fn tool(name: &str, description: &str, required: &[&str], properties: Value) -> Value {
    json!({
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "required": required,
                "properties": properties
            }
        }
    })
}

fn tools() -> Vec<Value> {
    vec![
        tool("create_note", "Save a durable local note.", &["text"], json!({"text":{"type":"string"}})),
        tool("search_notes", "Search saved notes by text.", &["query"], json!({"query":{"type":"string"}})),
        tool("create_todo", "Add an item to the local todo list.", &["text"], json!({"text":{"type":"string"},"due_at":{"type":"string","description":"Optional RFC3339 time"}})),
        tool("list_todos", "List todo items.", &[], json!({"include_done":{"type":"boolean"}})),
        tool("complete_todo", "Mark an open todo complete by id or matching text.", &["id_or_text"], json!({"id_or_text":{"type":"string"}})),
        tool("create_timer", "Create a persistent countdown timer.", &["duration_seconds","label"], json!({"duration_seconds":{"type":"integer"},"label":{"type":"string"}})),
        tool("create_reminder", "Create a persistent reminder at an absolute time.", &["label","due_at"], json!({"label":{"type":"string"},"due_at":{"type":"string","description":"RFC3339 local date/time with timezone"}})),
        tool("list_scheduled", "List pending timers and reminders.", &[], json!({})),
        tool("cancel_scheduled", "Cancel a pending timer or reminder by id. Use list_scheduled first when needed.", &["id"], json!({"id":{"type":"string"}})),
        tool("search_files", "Search files only inside folders currently allowed by the user in Nook settings.", &["query"], json!({"query":{"type":"string"},"limit":{"type":"integer"}})),
        tool("open_file", "Open a file returned by search_files. Only allowed user folders are accepted.", &["path"], json!({"path":{"type":"string"}})),
        tool("search_apps", "Search installed Windows Start Menu applications.", &["query"], json!({"query":{"type":"string"}})),
        tool("launch_app", "Launch an installed Windows application by name.", &["name"], json!({"name":{"type":"string"}})),
        tool("pet_action", "Animate the desktop pet. Valid actions: idle, walk, dance, hurt, angry, sleep, happy, eat, play, wave, surprised.", &["action"], json!({"action":{"type":"string"}})),
        tool("switch_character", "Switch the desktop pet character.", &["character"], json!({"character":{"type":"string","enum":["bear","panda","snake","moose"]}})),
        tool("feed_pet", "Feed the active pet its favorite food.", &[], json!({})),
        tool("play_pet", "Play with the active pet using its favorite toy.", &[], json!({})),
    ]
}

fn string_arg(args: &Value, key: &str) -> Result<String, String> {
    args.get(key).and_then(Value::as_str).map(|s| s.to_string()).ok_or_else(|| format!("Missing string argument: {key}"))
}

fn execute_tool(db: &Database, name: &str, args: &Value) -> Result<(String, Option<AgentEffect>), String> {
    match name {
        "create_note" => {
            let note = db.add_note(&string_arg(args, "text")?)?;
            Ok((serde_json::to_string(&note).unwrap_or_default(), None))
        }
        "search_notes" => {
            let notes = db.search_notes(&string_arg(args, "query")?, 8)?;
            Ok((serde_json::to_string(&notes).unwrap_or_default(), None))
        }
        "create_todo" => {
            let due = args.get("due_at").and_then(Value::as_str).filter(|s| !s.trim().is_empty()).map(str::to_string);
            let todo = db.add_todo(&string_arg(args, "text")?, due)?;
            Ok((serde_json::to_string(&todo).unwrap_or_default(), None))
        }
        "list_todos" => {
            let include_done = args.get("include_done").and_then(Value::as_bool).unwrap_or(false);
            let todos = db.list_todos(include_done, 30)?;
            Ok((serde_json::to_string(&todos).unwrap_or_default(), None))
        }
        "complete_todo" => {
            let todo = db.complete_todo(&string_arg(args, "id_or_text")?)?;
            Ok((serde_json::to_string(&todo).unwrap_or_default(), Some(AgentEffect { kind: "action".into(), value: "happy".into() })))
        }
        "create_timer" => {
            let seconds = args.get("duration_seconds").and_then(Value::as_i64).ok_or_else(|| "duration_seconds must be an integer.".to_string())?;
            let label = string_arg(args, "label")?;
            let item = scheduler::create_timer(db, &label, seconds)?;
            Ok((serde_json::to_string(&item).unwrap_or_default(), Some(AgentEffect { kind: "action".into(), value: "happy".into() })))
        }
        "create_reminder" => {
            let item = scheduler::create_reminder(db, &string_arg(args, "label")?, &string_arg(args, "due_at")?)?;
            Ok((serde_json::to_string(&item).unwrap_or_default(), Some(AgentEffect { kind: "action".into(), value: "happy".into() })))
        }
        "list_scheduled" => {
            let items = db.list_scheduled(false, 30)?;
            Ok((serde_json::to_string(&items).unwrap_or_default(), None))
        }
        "cancel_scheduled" => {
            let id = string_arg(args, "id")?;
            db.cancel_scheduled(&id)?;
            Ok((format!("Cancelled scheduled item {id}"), None))
        }
        "search_files" => {
            let limit = args.get("limit").and_then(Value::as_u64).unwrap_or(10) as usize;
            let configured = db.get_setting("allowed_file_roots")?.and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok()).unwrap_or_default();
            let roots = system_tools::normalize_allowed_roots(&configured);
            let roots = if roots.is_empty() { system_tools::default_file_roots() } else { roots };
            let results = system_tools::search_files_impl(&string_arg(args, "query")?, limit, &roots);
            Ok((serde_json::to_string(&results).unwrap_or_default(), None))
        }
        "open_file" => {
            let path = string_arg(args, "path")?;
            let configured = db.get_setting("allowed_file_roots")?.and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok()).unwrap_or_default();
            let roots = system_tools::normalize_allowed_roots(&configured);
            let roots = if roots.is_empty() { system_tools::default_file_roots() } else { roots };
            system_tools::open_file_impl(&path, &roots)?;
            Ok((format!("Opened {path}"), None))
        }
        "search_apps" => {
            let results = system_tools::search_apps_impl(&string_arg(args, "query")?, 10);
            Ok((serde_json::to_string(&results).unwrap_or_default(), None))
        }
        "launch_app" => {
            let app = system_tools::launch_app_by_name_impl(&string_arg(args, "name")?)?;
            Ok((serde_json::to_string(&app).unwrap_or_default(), Some(AgentEffect { kind: "action".into(), value: "happy".into() })))
        }
        "pet_action" => {
            let action = string_arg(args, "action")?.to_lowercase();
            let valid: HashSet<&'static str> = ["idle","walk","dance","hurt","angry","sleep","happy","eat","play","wave","surprised"].into_iter().collect();
            if !valid.contains(action.as_str()) {
                return Err("Unsupported pet action.".into());
            }
            Ok((format!("Pet action queued: {action}"), Some(AgentEffect { kind: "action".into(), value: action })))
        }
        "switch_character" => {
            let character = string_arg(args, "character")?.to_lowercase();
            if !["bear","panda","snake","moose"].contains(&character.as_str()) {
                return Err("Unsupported character.".into());
            }
            Ok((format!("Character switch queued: {character}"), Some(AgentEffect { kind: "character".into(), value: character })))
        }
        "feed_pet" => Ok(("Feed animation queued.".into(), Some(AgentEffect { kind: "feed".into(), value: "favorite".into() }))),
        "play_pet" => Ok(("Play animation queued.".into(), Some(AgentEffect { kind: "play".into(), value: "favorite".into() }))),
        _ => Err(format!("Unknown tool: {name}")),
    }
}

pub async fn run_agent(request: AgentRequest, db: Database) -> Result<AgentResponse, String> {
    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err("Prompt cannot be empty.".into());
    }
    let tool_defs = tools();
    let current_time = Local::now().to_rfc3339();
    let system = format!(
        "You are Nook, a concise friendly Windows desktop pet assistant. Active character: {}. Current local date/time: {}. Use tools whenever the user asks to save/recall notes, manage todos, set timers/reminders, search/open files, launch apps, or control the pet. Never invent successful tool execution. File access is restricted to user folders and app launch is restricted to indexed Start Menu/system apps. Keep final responses short and clear.",
        request.character, current_time
    );
    let mut messages = vec![
        json!({"role":"system","content":system}),
        json!({"role":"user","content":prompt}),
    ];
    let mut effects = Vec::new();
    let mut tools_used = Vec::new();

    let (mut assistant, provider) = choose_provider(&request, &messages, &tool_defs).await?;
    for _ in 0..6 {
        let tool_calls = assistant.get("tool_calls").and_then(Value::as_array).cloned().unwrap_or_default();
        let content = assistant.get("content").and_then(Value::as_str).unwrap_or_default().to_string();
        messages.push(assistant.clone());
        if tool_calls.is_empty() {
            return Ok(AgentResponse {
                message: if content.trim().is_empty() { "Done.".into() } else { content },
                effects,
                tools_used,
                provider,
            });
        }

        for call in tool_calls {
            let function = call.get("function").cloned().unwrap_or(Value::Null);
            let name = function.get("name").and_then(Value::as_str).unwrap_or_default().to_string();
            let args = function.get("arguments").cloned().unwrap_or_else(|| json!({}));
            if name.is_empty() {
                continue;
            }
            tools_used.push(name.clone());
            let result = match execute_tool(&db, &name, &args) {
                Ok((output, effect)) => {
                    if let Some(effect) = effect { effects.push(effect); }
                    output
                }
                Err(error) => format!("Tool error: {error}"),
            };
            messages.push(json!({"role":"tool","tool_name":name,"content":result}));
        }
        assistant = call_same_provider(&provider, &request, &messages, &tool_defs).await?;
    }

    Ok(AgentResponse {
        message: "I reached the tool-call safety limit for this request. The completed actions were kept.".into(),
        effects,
        tools_used,
        provider,
    })
}
