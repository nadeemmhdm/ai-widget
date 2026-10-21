# Nook AI Pet v1.0.0

First complete Windows source release of Nook AI Pet.

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
- NSIS/MSI release configuration
- Signed Tauri updater release pipeline and optional Windows Authenticode signing hook

## Security posture

Nook does not expose arbitrary shell/PowerShell execution to the AI. File access is restricted to configured roots, and cloud API secrets are not written to localStorage or SQLite.

## Publishing note

Auto-update publishing requires a stable Tauri updater signing key pair. Keep the private updater key secure and backed up before distributing v1.0.0 to users.
