# Security

## Local-first boundaries

- Cloud API keys are stored through Windows Credential Manager.
- File search/open operations are limited to configured allowed roots and canonical path validation.
- AI tools do not expose arbitrary shell, `cmd.exe`, PowerShell or `pwsh` execution.
- Application launching resolves known aliases and Windows Start Menu entries rather than executing free-form shell text.
- Production CSP remains enabled in the Tauri configuration.
- Tauri capabilities grant only the permissions required by the desktop pet and updater workflow.

## Update trust

Tauri updater artifacts must be signed. The updater private key must never be committed to the repository. Release configuration is generated from CI secrets; the development source build intentionally ships without placeholder updater trust material.

## Reporting

Do not include API keys, passwords, signing keys, personal files or other secrets in a vulnerability report.
