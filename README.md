# Nook AI Desktop Pet — v1.0.0

Nook is a Windows-first animated 3D AI desktop pet built with **Tauri 2 + React + TypeScript + React Three Fiber + Rust + SQLite**. It runs as a transparent, borderless, always-on-top companion instead of a conventional app window.

## Build status

- Phase 1 — Desktop Pet Core ✅
- Phase 2 — Multi-Character System ✅
- Phase 3 — AI Tools + Native Persistence ✅
- Phase 4 — Desktop Intelligence ✅
- Phase 5 — Release & Hardening ✅

## Characters

- 🐻 Bear — walk · honey · ball
- 🐼 Panda — waddle · bamboo · green ball
- 🐍 Snake — slither · egg · rattle ball
- 🫎 Moose — trot · leaves · pinecone

The repository bundles lightweight procedural 3D characters so it can run without third-party model downloads. The character architecture remains GLB/rig-animation ready for later artist-created production assets.

## Core experience

- transparent borderless always-on-top pet
- hidden from the Windows taskbar
- default 300 px size, adjustable from 180–600 px
- drag the pet anywhere on screen
- click to open the floating workspace
- repeated pokes trigger hurt/angry reactions
- autonomous walking/slithering/sleep/play behavior
- cursor/head/eye tracking
- morning/day/evening/night behavior
- multi-monitor-aware roaming
- character TTS with speech animation
- battery-aware Quality / Balanced / Battery rendering profiles
- Windows autostart

## Productivity workspace

Click the pet to open:

```text
Chat | Notes | Todo | Timers
```

Notes and todos persist in native SQLite. Timers/reminders are persisted and recovered after an app restart. A fired timer triggers an alarm, character reaction and spoken notification.

## AI

AI provider modes:

```text
Auto   → Ollama Cloud when configured, local Ollama fallback
Local  → local Ollama
Cloud  → Ollama Cloud
```

Native AI tools include:

```text
create_note       search_notes
create_todo       list_todos       complete_todo
create_timer      create_reminder  list_scheduled  cancel_scheduled
search_files      open_file
search_apps       launch_app
pet_action        switch_character feed_pet        play_pet
```

The AI is intentionally **not** given arbitrary `cmd.exe`, PowerShell or unrestricted shell execution.

## File access boundary

Default searchable roots are the user's Desktop, Documents, Downloads, Pictures, Videos and Music folders. Users can change the allowed folder list in Settings. File opening canonicalizes the path and refuses files outside the configured roots.

## Secret storage

The Ollama Cloud API key is stored using Windows Credential Manager through the Rust keyring layer. It is not persisted in localStorage or SQLite.

## First-run onboarding

v1.0.0 includes a four-step setup flow:

1. choose Bear, Panda, Snake or Moose
2. choose AI provider/models and optionally enter an Ollama Cloud API key
3. select behavior/speech/performance preferences
4. review controls and start Nook

## Crash recovery

The frontend has a React error boundary and an unclean-session marker. After an abnormal previous session, Nook restores conservative display/performance settings while leaving SQLite notes, todos and reminders untouched.

## Updates

The Tauri updater plugin is wired into the application and Settings includes **Check for updates**. The source package deliberately contains no fake release endpoint or signing key. Release CI generates updater configuration from GitHub secrets and produces signed updater artifacts.

See `release/UPDATER_SETUP.md`.

## Installer and release

Bundle targets:

```text
NSIS setup EXE
MSI
```

The NSIS installer defaults to **current-user installation**, so normal installs do not require Administrator elevation. Branding uses the bundled Nook bear icon for app/installer/uninstaller.

`.github/workflows/windows-release.yml` provides a Windows GitHub Actions release pipeline with:

- Node 22
- Rust 1.90
- source validation
- Tauri updater signing
- GitHub Release publishing
- optional Windows Authenticode PFX import hook

## Windows development requirements

1. Windows 10/11 with WebView2
2. Node.js 22+
3. Rust 1.90+ MSVC toolchain
4. Visual Studio Build Tools with Desktop development with C++
5. Optional local Ollama installation
6. Optional Ollama Cloud API key

## Run in development

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\WINDOWS_SETUP.ps1
```

Or:

```powershell
npm install
npm run tauri dev
```

## Validate

```powershell
npm run validate:release
npm run build
```

## Build Windows installers

```powershell
npm run tauri build
```

## Example commands

```text
switch to panda
feed panda
make the snake slither
save this as a note: renew domain next week
show my notes
add finish documentation to my todo list
complete todo documentation
set a timer for 10 minutes
remind me in 30 minutes to drink water
find resume.pdf
open VS Code
```

## Release validation performed for this package

- TypeScript/TSX syntax transpile check ✅
- relative import check ✅
- JSON/config parsing ✅
- version alignment ✅
- updater wiring/ACL scan ✅
- secret persistence scan ✅
- arbitrary shell exposure scan ✅
- ZIP integrity check ✅

The build environment used to package this source did not provide the Rust/MSVC Windows toolchain, and package-network installation timed out, so a native `.exe/.msi` compilation is not claimed here. Run the Windows CI workflow or the commands above on a Windows development machine for final native compilation.

See `PHASE5_CHECKLIST.md` and `RELEASE_NOTES_v1.0.0.md`.
