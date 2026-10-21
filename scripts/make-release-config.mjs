import fs from 'node:fs'
import path from 'node:path'

const repo = process.env.GITHUB_REPOSITORY || process.env.NOOK_GITHUB_REPOSITORY
const pubkey = process.env.TAURI_SIGNING_PUBLIC_KEY?.trim()
if (!repo) throw new Error('GITHUB_REPOSITORY or NOOK_GITHUB_REPOSITORY is required.')

const config = pubkey
  ? {
      bundle: { createUpdaterArtifacts: true },
      plugins: {
        updater: {
          pubkey,
          endpoints: [`https://github.com/${repo}/releases/latest/download/latest.json`],
          windows: { installMode: 'passive' },
        },
      },
    }
  : {
      bundle: { createUpdaterArtifacts: false },
    }

fs.mkdirSync('release', { recursive: true })
const out = path.resolve('release/tauri.release.conf.json')
fs.writeFileSync(out, JSON.stringify(config, null, 2) + '\n')

if (pubkey) {
  console.log(`Generated signed-updater release config: ${out}`)
} else {
  console.log(`No TAURI_SIGNING_PUBLIC_KEY configured; generated normal installer release config: ${out}`)
}
