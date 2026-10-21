# Nook AI Pet v1.0.0

First public Windows release of Nook AI Pet.

## Downloads

- **Windows Setup (EXE)** — recommended for most users
- **Windows MSI** — alternative installer for managed/manual installs

## Highlights

- Four animated desktop companions: Bear, Panda, Snake and Moose
- Transparent always-on-top desktop pet experience
- Drag, resize, poke reactions, character food/toys and moods
- Autonomous movement, cursor gaze, day/night behavior and multi-monitor roaming
- Chat, Notes, Todo and persistent Timers/Reminders
- Ollama Local, Ollama Cloud and automatic fallback mode
- Restricted file search/open and safe installed-application launching
- Secure Windows Credential Manager storage for the cloud API key
- Battery-aware rendering profiles
- First-run onboarding
- Crash-safe frontend recovery
- Windows autostart

## Build verification

The Windows frontend, Rust/Tauri application, NSIS installer and MSI installer were successfully built and verified by GitHub Actions from commit `e17e70f4480dde2a45c62dd21ad939560d434680`.

## Security

Nook does not expose arbitrary shell or PowerShell execution to the AI. File access is restricted to configured roots, and cloud API secrets are not stored in localStorage or SQLite.

> Note: this release does not require updater-signing secrets to install. Windows may still show a SmartScreen warning until Authenticode code signing is configured for future releases.
