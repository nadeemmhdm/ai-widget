# Nook AI Pet v1.0.1

Windows startup hotfix release.

## Fixed

- Removed the terminal/console window that appeared when launching the production Windows app.
- Made optional autostart and updater plugin initialization fail-soft so a plugin/configuration issue no longer closes the app during startup.
- Added resilient SQLite startup recovery. If the local database cannot be opened, Nook backs it up and retries; a temporary fallback database is used if the normal app-data path remains unavailable.
- Replaced the final native `.expect(...)` crash path with diagnostic logging and a Windows error dialog for unrecoverable startup failures.
- Added a Windows runtime smoke test in CI: the compiled app is launched and must remain alive before installers are uploaded.

## Diagnostics

If a native startup failure still occurs, Nook writes a diagnostic log to:

`%LOCALAPPDATA%\Nook AI Pet\logs\startup.log`

## Download

Use the Windows Setup EXE for normal installation. The MSI is also provided for managed/manual installs.
