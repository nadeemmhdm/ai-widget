# Nook AI Desktop Pet — Build phases

## Phase 1 — Desktop Pet Core ✅
Tauri 2 transparent always-on-top shell, procedural 3D Bear, drag/resize, command bubble, poke reactions, local productivity commands, Ollama bridge and Windows autostart.

## Phase 2 — Character System ✅
Bear, Panda, Snake and Moose; character-specific movement, shared animation contract, food/toys, per-character mood persistence and GLB-ready asset structure.

## Phase 3 — AI Tools + Persistence ✅
SQLite, persistent timers/reminders, Ollama tool loop, restricted Windows file search/open, installed-app search/launch, Credential Manager cloud key storage and AI-driven pet effects.

## Phase 4 — Desktop Intelligence ✅
Autonomous behavior, cursor gaze, time-of-day behavior, multi-monitor roaming, richer mood model, TTS mouth animation, battery-aware FPS/render profiles, configurable file roots and rich Chat/Notes/Todo/Timers workspace.

## Phase 5 — Release & Hardening ✅
- v1.0.0 version alignment
- first-run onboarding and AI setup wizard
- safe crash/unclean-session recovery
- updater plugin + UI + ACL wiring
- updater configuration generated from real release secrets
- signed updater artifact pipeline
- Windows GitHub Actions release workflow
- optional Authenticode PFX signing hook
- current-user NSIS installer polish + installer/uninstaller icon
- final release/security validation scripts
- updated release docs/checklists

## Current status

**All planned phases are complete in source.** Final native Windows compilation/signing still requires a Windows build host and, for published auto-updates, the real updater signing keys/release repository configuration.
