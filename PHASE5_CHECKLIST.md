# Phase 5 — Release Checklist

## Product
- [x] First-run 4-step onboarding
- [x] Character, AI and behavior setup
- [x] Optional secure Ollama Cloud key entry
- [x] Crash/error boundary with safe-setting recovery
- [x] Unclean-session detection and safe display reset
- [x] In-app updater check UI with graceful unconfigured state
- [x] Product version moved to 1.0.0
- [x] Current-user NSIS installation mode (no admin requirement by default)

## Release engineering
- [x] Tauri updater plugin wired with ACL permission
- [x] Updater configuration generated only from release secrets
- [x] Mandatory updater-signature workflow supported
- [x] Windows GitHub Actions release workflow
- [x] Optional Authenticode PFX certificate import hook
- [x] MSI + NSIS targets retained
- [x] Static security/version validation script
- [x] Release documentation and updater key instructions

## Security boundaries retained
- [x] Cloud API key remains in Windows Credential Manager
- [x] File operations stay constrained to configured roots
- [x] No arbitrary cmd.exe/PowerShell execution exposed to AI
- [x] Tauri capability allow-list includes only required updater commands
- [x] Production CSP retained

## Final external prerequisites
- [ ] Run native Windows build on a Windows host with Rust/MSVC/WebView2 tooling
- [ ] Add real updater signing secrets before publishing auto-updates
- [ ] Add optional Authenticode certificate if trusted publisher identity is desired
