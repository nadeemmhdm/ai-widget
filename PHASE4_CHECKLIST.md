# Phase 4 Completion Checklist — v0.4.0

## Autonomous behaviour
- [x] autonomous behavior toggle
- [x] idle action selection based on mood and time of day
- [x] hunger / boredom / sleepiness / energy evolution
- [x] night-time sleep bias
- [x] user interaction temporarily suppresses autonomous actions
- [x] autonomous roaming can be disabled

## Cursor and character reactions
- [x] desktop-level cursor position tracking through Tauri
- [x] normalized gaze vector relative to pet window
- [x] Bear/Panda head + eye response
- [x] Snake/Moose head response
- [x] battery mode lowers gaze polling frequency

## Multi-monitor movement
- [x] current monitor work-area detection
- [x] pet window movement constrained to visible monitor work area
- [x] available monitor count detection
- [x] current-monitor roaming mode
- [x] all-monitors roaming mode
- [x] manual next-display control

## Speech and animation
- [x] TTS start/end state connected to renderer
- [x] mouth animation while the pet speaks
- [x] existing alarm speech remains compatible

## Performance / battery
- [x] native Windows power-status command
- [x] AC/battery percentage status
- [x] automatic battery-saver recommendation at low battery
- [x] Quality profile: up to 2x DPR / 60 FPS
- [x] Balanced profile: up to 1.4x DPR / 40 FPS
- [x] Battery profile: 1x DPR / 24 FPS / low-power WebGL preference
- [x] Auto mode switches profile based on power source

## File access controls
- [x] default user folders remain initial allowed roots
- [x] configured roots persisted in SQLite settings
- [x] user can add/remove existing allowed directories
- [x] minimum one allowed folder enforced
- [x] maximum 12 configured roots
- [x] AI search_files uses configured roots
- [x] AI open_file validates configured roots
- [x] frontend file search/open uses same native boundary

## Rich productivity UI
- [x] Chat tab
- [x] Notes tab
- [x] Todo tab
- [x] Timers tab
- [x] direct note creation/deletion
- [x] todo creation/completion/deletion
- [x] timer 5/10/25-minute presets
- [x] timer/reminder cancellation
- [x] expanded mood display
- [x] behavior, roaming, performance, file-access settings

## Packaging validation in this environment
- [x] TypeScript syntax/transpile validation
- [x] relative import validation
- [x] JSON manifest/config validation
- [x] version bumped to 0.4.0
- [ ] native Rust/Windows build — requires Rust MSVC toolchain + Windows/WebView2
- [ ] npm dependency compile — package installation timed out in this environment
