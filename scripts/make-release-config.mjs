import fs from 'node:fs'
import path from 'node:path'

const repo = process.env.GITHUB_REPOSITORY || process.env.NOOK_GITHUB_REPOSITORY
const pubkey = process.env.TAURI_SIGNING_PUBLIC_KEY
if (!repo) throw new Error('GITHUB_REPOSITORY or NOOK_GITHUB_REPOSITORY is required.')
if (!pubkey) throw new Error('TAURI_SIGNING_PUBLIC_KEY is required.')

const config = {
  bundle: { createUpdaterArtifacts: true },
  plugins: {
    updater: {
      pubkey,
      endpoints: [`https://github.com/${repo}/releases/latest/download/latest.json`],
      windows: { installMode: 'passive' },
    },
  },
}
fs.mkdirSync('release', { recursive: true })
const out = path.resolve('release/tauri.release.conf.json')
fs.writeFileSync(out, JSON.stringify(config, null, 2) + '\n')
console.log(`Generated ${out}`)
