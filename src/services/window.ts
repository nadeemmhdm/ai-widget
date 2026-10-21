import type { GazeVector } from '../types/pet'

const inTauri = () => '__TAURI_INTERNALS__' in window

export type LayoutSnapshot = {
  open: boolean
  petSize: number
}

export async function syncPetWindow({ open, petSize }: LayoutSnapshot) {
  if (!inTauri()) return

  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/dpi')
  const win = getCurrentWindow()

  const scale = await win.scaleFactor()
  const oldPos = await win.outerPosition()
  const oldSize = await win.outerSize()

  const closedW = Math.round((petSize + 44) * scale)
  const closedH = Math.round((petSize + 52) * scale)
  const openW = Math.round(Math.max(460, petSize + 44) * scale)
  const openH = Math.round((petSize + 310) * scale)

  const nextW = open ? openW : closedW
  const nextH = open ? openH : closedH
  const bottomCenterX = oldPos.x + oldSize.width / 2
  const bottomY = oldPos.y + oldSize.height
  const nextX = Math.round(bottomCenterX - nextW / 2)
  const nextY = Math.round(bottomY - nextH)

  await win.setSize(new PhysicalSize(nextW, nextH))
  await win.setPosition(new PhysicalPosition(nextX, nextY))
}

export async function moveWindowFromDrag(
  startWindowX: number,
  startWindowY: number,
  deltaScreenX: number,
  deltaScreenY: number,
  scale: number,
) {
  if (!inTauri()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { PhysicalPosition } = await import('@tauri-apps/api/dpi')
  await getCurrentWindow().setPosition(
    new PhysicalPosition(
      Math.round(startWindowX + deltaScreenX * scale),
      Math.round(startWindowY + deltaScreenY * scale),
    ),
  )
}

export async function getWindowDragSnapshot() {
  if (!inTauri()) return { x: 0, y: 0, scale: window.devicePixelRatio || 1 }
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  const pos = await win.outerPosition()
  const scale = await win.scaleFactor()
  return { x: pos.x, y: pos.y, scale }
}

export async function getCursorGaze(): Promise<GazeVector> {
  if (!inTauri()) return { x: 0, y: 0, proximity: 0 }
  const { cursorPosition, getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  const [cursor, pos, size] = await Promise.all([cursorPosition(), win.outerPosition(), win.outerSize()])
  const cx = pos.x + size.width / 2
  const cy = pos.y + size.height * 0.58
  const dx = cursor.x - cx
  const dy = cursor.y - cy
  const radius = Math.max(220, Math.min(700, Math.max(size.width, size.height) * 1.7))
  const x = Math.max(-1, Math.min(1, dx / radius))
  const y = Math.max(-1, Math.min(1, dy / radius))
  const proximity = Math.max(0, 1 - Math.hypot(dx, dy) / radius)
  return { x, y, proximity }
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

async function animateTo(targetX: number, targetY: number, durationMs = 1600) {
  if (!inTauri()) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { PhysicalPosition } = await import('@tauri-apps/api/dpi')
  const win = getCurrentWindow()
  const start = await win.outerPosition()
  const steps = Math.max(8, Math.min(32, Math.round(durationMs / 55)))
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    await win.setPosition(new PhysicalPosition(
      Math.round(start.x + (targetX - start.x) * eased),
      Math.round(start.y + (targetY - start.y) * eased),
    ))
    await sleep(durationMs / steps)
  }
}

export async function roamWithinCurrentMonitor(deltaX: number, deltaY = 0, durationMs = 1700) {
  if (!inTauri()) return
  const { currentMonitor, getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  const [monitor, pos, size] = await Promise.all([currentMonitor(), win.outerPosition(), win.outerSize()])
  if (!monitor) return
  const work = monitor.workArea
  const minX = work.position.x
  const minY = work.position.y
  const maxX = work.position.x + work.size.width - size.width
  const maxY = work.position.y + work.size.height - size.height
  const targetX = Math.max(minX, Math.min(maxX, pos.x + deltaX))
  const targetY = Math.max(minY, Math.min(maxY, pos.y + deltaY))
  await animateTo(targetX, targetY, durationMs)
}

export async function moveToNextMonitorBottom(durationMs = 2300) {
  if (!inTauri()) return false
  const { availableMonitors, currentMonitor, getCurrentWindow } = await import('@tauri-apps/api/window')
  const [monitors, current] = await Promise.all([availableMonitors(), currentMonitor()])
  if (monitors.length < 2) return false
  const win = getCurrentWindow()
  const size = await win.outerSize()
  const index = Math.max(0, monitors.findIndex((m) => m.name === current?.name && m.position.x === current?.position.x && m.position.y === current?.position.y))
  const next = monitors[(index + 1) % monitors.length]
  const targetX = Math.round(next.workArea.position.x + (next.workArea.size.width - size.width) / 2)
  const targetY = Math.round(next.workArea.position.y + next.workArea.size.height - size.height - 8)
  await animateTo(targetX, targetY, durationMs)
  return true
}

export async function monitorCount() {
  if (!inTauri()) return 1
  const { availableMonitors } = await import('@tauri-apps/api/window')
  return (await availableMonitors()).length
}

export async function syncSetupWindow(active: boolean) {
  if (!inTauri()) return
  const { getCurrentWindow, currentMonitor } = await import('@tauri-apps/api/window')
  const { PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/dpi')
  const win = getCurrentWindow()
  if (!active) return
  const [scale, monitor] = await Promise.all([win.scaleFactor(), currentMonitor()])
  const width = Math.round(520 * scale)
  const height = Math.round(620 * scale)
  await win.setSize(new PhysicalSize(width, height))
  if (monitor) {
    const x = Math.round(monitor.workArea.position.x + (monitor.workArea.size.width - width) / 2)
    const y = Math.round(monitor.workArea.position.y + (monitor.workArea.size.height - height) / 2)
    await win.setPosition(new PhysicalPosition(x, y))
  }
}
