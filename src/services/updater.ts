import { inTauri } from './native'

export type UpdateCheck = { configured: boolean; available: boolean; version?: string; notes?: string; install?: () => Promise<void> }

export async function checkForUpdates(): Promise<UpdateCheck> {
  if (!inTauri()) return { configured: false, available: false }
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check({ timeout: 15_000 })
    if (!update) return { configured: true, available: false }
    return {
      configured: true,
      available: true,
      version: update.version,
      notes: update.body ?? undefined,
      install: () => update.downloadAndInstall(),
    }
  } catch (error) {
    const text = String(error).toLowerCase()
    const unconfigured = text.includes('endpoint') || text.includes('pubkey') || text.includes('configuration')
    if (unconfigured) return { configured: false, available: false }
    throw error
  }
}
