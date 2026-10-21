const BOOT_KEY = 'nook.session.booting.v1'
const RECOVERY_KEY = 'nook.recovery.notice.v1'

export type RecoveryState = { recovered: boolean; message?: string }

export function beginSessionRecovery(): RecoveryState {
  const previousUnclean = localStorage.getItem(BOOT_KEY) === 'true'
  localStorage.setItem(BOOT_KEY, 'true')
  if (!previousUnclean) return { recovered: false }

  // Reset only settings that can make the pet unusable/off-screen or too heavy.
  localStorage.setItem('nook.petSize', '300')
  try {
    const behavior = JSON.parse(localStorage.getItem('nook.behavior.v4') ?? '{}')
    localStorage.setItem('nook.behavior.v4', JSON.stringify({ ...behavior, performanceMode: 'balanced', roamMode: 'current-monitor' }))
  } catch {
    localStorage.removeItem('nook.behavior.v4')
  }
  const message = 'Nook detected an unclean previous session and restored safe display settings.'
  localStorage.setItem(RECOVERY_KEY, message)
  return { recovered: true, message }
}

export function markSessionHealthy() {
  localStorage.setItem(BOOT_KEY, 'false')
}

export function takeRecoveryNotice(): string | null {
  const message = localStorage.getItem(RECOVERY_KEY)
  if (message) localStorage.removeItem(RECOVERY_KEY)
  return message
}
