import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const pkg = readJson('package.json')
const tauri = readJson('src-tauri/tauri.conf.json')
const caps = readJson('src-tauri/capabilities/default.json')
const cargo = fs.readFileSync(path.join(root,'src-tauri/Cargo.toml'),'utf8')
const lib = fs.readFileSync(path.join(root,'src-tauri/src/lib.rs'),'utf8')

const errors = []
if (pkg.version !== tauri.version) errors.push(`package version ${pkg.version} != Tauri ${tauri.version}`)
if (!cargo.includes(`version = "${pkg.version}"`)) errors.push('Cargo version does not match package version')
if (!caps.permissions.includes('updater:default')) errors.push('updater:default capability missing')
if (!lib.includes('tauri_plugin_updater')) errors.push('Tauri updater plugin is not initialized')
if (!fs.existsSync(path.join(root,'src/components/Onboarding.tsx'))) errors.push('Onboarding component missing')
if (!fs.existsSync(path.join(root,'src/components/ErrorBoundary.tsx'))) errors.push('Error boundary missing')

const sourceFiles = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(rs|ts|tsx)$/.test(entry.name)) sourceFiles.push(full)
  }
}
walk(path.join(root,'src')); walk(path.join(root,'src-tauri/src'))
const combined = sourceFiles.map((p)=>fs.readFileSync(p,'utf8')).join('\n')
for (const banned of ['Command::new("cmd.exe")','Command::new("powershell")','Command::new("pwsh")']) {
  if (combined.includes(banned)) errors.push(`unsafe arbitrary shell pattern found: ${banned}`)
}
if (combined.includes('localStorage.setItem(\'nook.cloud')) errors.push('possible cloud secret persisted in localStorage')

if (errors.length) {
  console.error('Release validation failed:')
  for (const e of errors) console.error(` - ${e}`)
  process.exit(1)
}
console.log(`Nook ${pkg.version} release validation passed (${sourceFiles.length} source files scanned).`)
