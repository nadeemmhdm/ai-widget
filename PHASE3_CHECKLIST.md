# Phase 3 completion checklist

## Persistence
- [x] SQLite database initialized in Tauri app data
- [x] WAL mode
- [x] Notes CRUD core
- [x] Todo add/list/complete
- [x] Persistent scheduled table
- [x] Legacy Phase 1/2 localStorage migration

## Scheduler
- [x] Persistent timer creation
- [x] Persistent reminder creation
- [x] Pending schedule listing
- [x] Schedule cancellation backend
- [x] Rust scheduler loop
- [x] Tauri `schedule-fired` events
- [x] Alarm tone + pet animation + speech + notification on fire

## AI
- [x] Ollama `/api/chat` tool schema
- [x] Multi-turn tool loop
- [x] Local mode
- [x] Cloud mode
- [x] Auto cloud → local fallback
- [x] Tool execution result returned to model
- [x] Tool-loop maximum iteration boundary
- [x] Pet visual effects returned to frontend

## Windows integration
- [x] Filename search in standard user folders
- [x] Safe file open validation
- [x] Start Menu shortcut discovery
- [x] Dynamic installed-app launch
- [x] Curated Windows app aliases
- [x] No generic shell execution tool

## Secrets
- [x] Cloud API key removed from frontend persisted settings
- [x] Windows native credential storage integration
- [x] Save/remove/status UI

## Packaging
- [x] Version bumped to 0.3.0
- [x] README updated
- [x] Phase roadmap updated
- [x] Archive validation

## Native build note
- [ ] Compile/test on target Windows machine (packaging environment has no Rust toolchain and npm dependency fetch did not complete)
