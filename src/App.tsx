import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { CommandBubble } from './components/CommandBubble'
import { Onboarding } from './components/Onboarding'
import { PetScene } from './pet/PetScene'
import { CHARACTER_DEFINITIONS } from './pet/characters/definitions'
import { askAi, type AiSettings } from './services/ai'
import { chooseAutonomousAction, dayPartFor, effectivePerformanceMode } from './services/behavior'
import { runLocalCommand } from './services/commands'
import { getPowerStatus, hasCloudApiKey, isPetAction, migrateLegacyLocalStorage, type AgentEffect, type ScheduledItem } from './services/native'
import { takeRecoveryNotice } from './services/recovery'
import { playAlarmTone, speak, stopSpeaking } from './services/speech'
import { getCursorGaze, getWindowDragSnapshot, monitorCount, moveToNextMonitorBottom, moveWindowFromDrag, roamWithinCurrentMonitor, syncPetWindow, syncSetupWindow } from './services/window'
import type { ActivePetItem, BehaviorSettings, CharacterId, GazeVector, PetAction, PetMood, PowerStatus } from './types/pet'
import './styles/app.css'

const defaultAi: AiSettings = {
  mode: 'auto',
  localModel: 'qwen3.5:4b',
  cloudModel: 'qwen3.5:cloud',
}

const DEFAULT_MOOD: PetMood = {
  happiness: 78,
  hunger: 22,
  energy: 70,
  anger: 0,
  affection: 66,
  boredom: 18,
  sleepiness: 20,
}

const DEFAULT_BEHAVIOR: BehaviorSettings = {
  autonomous: true,
  cursorTracking: true,
  roamMode: 'current-monitor',
  performanceMode: 'auto',
  quietAtNight: true,
}

const DEFAULT_POWER: PowerStatus = { onAcPower: null, batteryPercent: null, batterySaverRecommended: false }
const ZERO_GAZE: GazeVector = { x: 0, y: 0, proximity: 0 }

function readCharacter(): CharacterId {
  const value = localStorage.getItem('nook.character')
  return value === 'panda' || value === 'snake' || value === 'moose' ? value : 'bear'
}

function readMood(character: CharacterId): PetMood {
  try { return { ...DEFAULT_MOOD, ...JSON.parse(localStorage.getItem(`nook.mood.${character}`) ?? '{}') } }
  catch { return DEFAULT_MOOD }
}

function readBehavior(): BehaviorSettings {
  try { return { ...DEFAULT_BEHAVIOR, ...JSON.parse(localStorage.getItem('nook.behavior.v4') ?? '{}') } }
  catch { return DEFAULT_BEHAVIOR }
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(() => localStorage.getItem('nook.onboarding.v1') === 'complete')
  const [character, setCharacter] = useState<CharacterId>(readCharacter)
  const [petSize, setPetSize] = useState(() => Number(localStorage.getItem('nook.petSize') ?? 300))
  const [action, setAction] = useState<PetAction>('idle')
  const [activeItem, setActiveItem] = useState<ActivePetItem>(null)
  const [response, setResponse] = useState(() => `Hi! I’m ${CHARACTER_DEFINITIONS[readCharacter()].name}. Click me, drag me, or type a command.`)
  const [busy, setBusy] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(() => localStorage.getItem('nook.speech') !== 'false')
  const [speaking, setSpeaking] = useState(false)
  const [cloudKeyConfigured, setCloudKeyConfigured] = useState(false)
  const [behavior, setBehavior] = useState<BehaviorSettings>(readBehavior)
  const [power, setPower] = useState<PowerStatus>(DEFAULT_POWER)
  const [gaze, setGaze] = useState<GazeVector>(ZERO_GAZE)
  const [dayPart, setDayPart] = useState(dayPartFor)
  const [displayCount, setDisplayCount] = useState(1)
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    try { return { ...defaultAi, ...JSON.parse(localStorage.getItem('nook.ai.v3') ?? '{}') } }
    catch { return defaultAi }
  })
  const [mood, setMood] = useState<PetMood>(() => readMood(readCharacter()))

  const effectivePerformance = useMemo(() => effectivePerformanceMode(behavior.performanceMode, power), [behavior.performanceMode, power])
  const pokeTimes = useRef<number[]>([])
  const drag = useRef({ active: false, dragged: false, startScreenX: 0, startScreenY: 0, startWindowX: 0, startWindowY: 0, scale: 1 })
  const actionTimer = useRef<number | null>(null)
  const itemTimer = useRef<number | null>(null)
  const roaming = useRef(false)
  const lastInteraction = useRef(Date.now())

  function temporaryAction(next: PetAction, duration = 2600, persistent = next === 'sleep') {
    if (actionTimer.current) window.clearTimeout(actionTimer.current)
    setAction(next)
    if (!persistent) actionTimer.current = window.setTimeout(() => setAction('idle'), duration)
  }

  function showItem(item: ActivePetItem, duration = 3600) {
    if (itemTimer.current) window.clearTimeout(itemTimer.current)
    setActiveItem(item)
    itemTimer.current = window.setTimeout(() => setActiveItem(null), duration)
  }

  function say(message: string) {
    setResponse(message)
    speak(message, speechEnabled, {
      onStart: () => setSpeaking(true),
      onBoundary: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    })
  }

  function markInteraction() {
    lastInteraction.current = Date.now()
  }

  function selectCharacter(next: CharacterId) {
    markInteraction()
    if (next === character) return
    localStorage.setItem(`nook.mood.${character}`, JSON.stringify(mood))
    localStorage.setItem('nook.character', next)
    setCharacter(next)
    setMood(readMood(next))
    setActiveItem(null)
    temporaryAction('happy', 1800, false)
    const nextPet = CHARACTER_DEFINITIONS[next]
    say(`${nextPet.emoji} ${nextPet.name} is ready! Favorite food: ${nextPet.favoriteFood.label}.`)
  }

  function applyAction(actionName: PetAction) {
    markInteraction()
    temporaryAction(actionName, actionName === 'eat' || actionName === 'play' ? 3800 : 2600, actionName === 'sleep')
    setMood((m) => ({
      happiness: Math.min(100, m.happiness + (actionName === 'eat' ? 8 : actionName === 'play' ? 10 : actionName === 'happy' ? 4 : 1)),
      hunger: actionName === 'eat' ? Math.max(0, m.hunger - 22) : m.hunger,
      energy: actionName === 'play' ? Math.max(0, m.energy - 4) : m.energy,
      anger: actionName === 'eat' || actionName === 'play' || actionName === 'happy' ? Math.max(0, m.anger - 8) : m.anger,
      affection: Math.min(100, m.affection + (actionName === 'eat' ? 2 : actionName === 'play' ? 4 : actionName === 'happy' ? 2 : 0)),
      boredom: actionName === 'play' ? Math.max(0, m.boredom - 28) : actionName === 'walk' || actionName === 'dance' ? Math.max(0, m.boredom - 10) : m.boredom,
      sleepiness: actionName === 'sleep' ? Math.max(0, m.sleepiness - 18) : m.sleepiness,
    }))
  }

  function applyAgentEffect(effect: AgentEffect) {
    if (effect.kind === 'action' && isPetAction(effect.value)) { applyAction(effect.value); return }
    if (effect.kind === 'character' && ['bear', 'panda', 'snake', 'moose'].includes(effect.value)) { selectCharacter(effect.value as CharacterId); return }
    if (effect.kind === 'feed') {
      const pet = CHARACTER_DEFINITIONS[character]
      showItem({ kind: 'food', id: pet.favoriteFood.id, label: pet.favoriteFood.label })
      applyAction('eat')
      return
    }
    if (effect.kind === 'play') {
      const pet = CHARACTER_DEFINITIONS[character]
      showItem({ kind: 'toy', id: pet.favoriteToy.id, label: pet.favoriteToy.label })
      applyAction('play')
    }
  }

  useEffect(() => {
    localStorage.setItem('nook.petSize', String(petSize))
    if (!onboardingComplete) void syncSetupWindow(true)
    else void syncPetWindow({ open, petSize })
  }, [open, petSize, onboardingComplete])

  useEffect(() => { localStorage.setItem('nook.speech', String(speechEnabled)); if (!speechEnabled) { stopSpeaking(); setSpeaking(false) } }, [speechEnabled])
  useEffect(() => { localStorage.setItem('nook.ai.v3', JSON.stringify(aiSettings)) }, [aiSettings])
  useEffect(() => { localStorage.setItem('nook.behavior.v4', JSON.stringify(behavior)) }, [behavior])
  useEffect(() => { localStorage.setItem(`nook.mood.${character}`, JSON.stringify(mood)) }, [character, mood])

  useEffect(() => {
    void migrateLegacyLocalStorage()
    const recovered = takeRecoveryNotice()
    if (recovered) setResponse(recovered)
    void hasCloudApiKey().then(setCloudKeyConfigured).catch(() => setCloudKeyConfigured(false))
    void getPowerStatus().then(setPower).catch(() => setPower(DEFAULT_POWER))
    void monitorCount().then(setDisplayCount).catch(() => setDisplayCount(1))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void getPowerStatus().then(setPower).catch(() => undefined)
      void monitorCount().then(setDisplayCount).catch(() => undefined)
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setDayPart(dayPartFor()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!behavior.cursorTracking) { setGaze(ZERO_GAZE); return }
    const delay = effectivePerformance === 'battery' ? 520 : effectivePerformance === 'balanced' ? 300 : 180
    const interval = window.setInterval(() => {
      if (open || drag.current.active) return
      void getCursorGaze().then(setGaze).catch(() => undefined)
    }, delay)
    return () => window.clearInterval(interval)
  }, [behavior.cursorTracking, effectivePerformance, open])

  useEffect(() => {
    let disposed = false
    let unlisten: undefined | (() => void)
    void (async () => {
      if (!('__TAURI_INTERNALS__' in window)) return
      const { listen } = await import('@tauri-apps/api/event')
      const stop = await listen<ScheduledItem>('schedule-fired', (event) => {
        const item = event.payload
        const message = `${item.kind === 'timer' ? 'Timer finished' : 'Reminder'}: ${item.label}`
        temporaryAction('surprised', 1200, false)
        window.setTimeout(() => temporaryAction('happy', 3500, false), 1250)
        void playAlarmTone()
        say(message)
        if ('Notification' in window) {
          if (Notification.permission === 'granted') new Notification('Nook AI Pet', { body: message })
          else if (Notification.permission === 'default') void Notification.requestPermission()
        }
      })
      if (disposed) stop(); else unlisten = stop
    })()
    return () => { disposed = true; unlisten?.() }
  }, [speechEnabled])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const night = dayPartFor() === 'night'
      setMood((m) => {
        const sleeping = action === 'sleep'
        const hunger = Math.min(100, m.hunger + (Math.random() < .42 ? 1 : 0))
        const boredom = Math.min(100, m.boredom + (sleeping ? 0 : 1))
        const sleepiness = sleeping ? Math.max(0, m.sleepiness - 4) : Math.min(100, m.sleepiness + (night ? 3 : 1))
        const energy = sleeping ? Math.min(100, m.energy + 4) : Math.max(0, m.energy - (Math.random() < .35 ? 1 : 0))
        const happinessPenalty = hunger > 82 || boredom > 86 ? 1 : 0
        return {
          happiness: Math.max(0, m.happiness - happinessPenalty),
          hunger,
          energy,
          anger: Math.max(0, m.anger - 1),
          affection: m.affection,
          boredom,
          sleepiness,
        }
      })
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [action])

  useEffect(() => {
    if (!behavior.autonomous) return
    const interval = window.setInterval(() => {
      if (open || busy || speaking || drag.current.active || roaming.current) return
      if (Date.now() - lastInteraction.current < 8_000) return
      const behaviorDayPart = dayPart === 'night' && !behavior.quietAtNight ? 'evening' : dayPart
      const selected = chooseAutonomousAction(mood, behaviorDayPart)
      const duration = selected === 'sleep' ? 8_500 : selected === 'walk' ? 3_500 : 2_700
      temporaryAction(selected, duration, false)
      if (selected === 'walk' && behavior.roamMode !== 'off' && !(behavior.quietAtNight && dayPart === 'night')) {
        roaming.current = true
        const task = behavior.roamMode === 'all-monitors' && displayCount > 1 && Math.random() < .18
          ? moveToNextMonitorBottom(2500)
          : roamWithinCurrentMonitor((Math.random() < .5 ? -1 : 1) * (70 + Math.random() * 150), (Math.random() - .5) * 34, 1800)
        void Promise.resolve(task).finally(() => { roaming.current = false })
      }
    }, effectivePerformance === 'battery' ? 18_000 : 12_000)
    return () => window.clearInterval(interval)
  }, [behavior.autonomous, behavior.quietAtNight, behavior.roamMode, busy, dayPart, displayCount, effectivePerformance, mood, open, speaking])

  useEffect(() => () => {
    if (actionTimer.current) window.clearTimeout(actionTimer.current)
    if (itemTimer.current) window.clearTimeout(itemTimer.current)
    stopSpeaking()
  }, [])

  async function handleCommand(prompt: string) {
    markInteraction()
    setBusy(true)
    try {
      const local = await runLocalCommand(prompt, character)
      if (local) {
        if (local.switchCharacter) selectCharacter(local.switchCharacter)
        else {
          say(local.message)
          if (local.item) showItem(local.item)
          if (local.action) applyAction(local.action)
        }
        return
      }

      setAction('idle')
      const result = await askAi(prompt, aiSettings, character)
      say(result.message)
      for (const effect of result.effects) applyAgentEffect(effect)
    } catch (error) {
      say(`I couldn’t complete that command. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function onPetPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    markInteraction()
    event.currentTarget.setPointerCapture(event.pointerId)
    const snap = await getWindowDragSnapshot()
    drag.current = { active: true, dragged: false, startScreenX: event.screenX, startScreenY: event.screenY, startWindowX: snap.x, startWindowY: snap.y, scale: snap.scale }
  }

  async function onPetPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const dx = event.screenX - drag.current.startScreenX
    const dy = event.screenY - drag.current.startScreenY
    if (Math.hypot(dx, dy) < 5 && !drag.current.dragged) return
    drag.current.dragged = true
    await moveWindowFromDrag(drag.current.startWindowX, drag.current.startWindowY, dx, dy, drag.current.scale)
  }

  function onPetPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    const wasDragged = drag.current.dragged
    drag.current.active = false
    if (wasDragged) return

    const now = Date.now()
    pokeTimes.current = [...pokeTimes.current.filter((time) => now - time < 1500), now]
    const pokes = pokeTimes.current.length
    if (pokes >= 4) {
      setMood((m) => ({ ...m, anger: Math.min(100, m.anger + 28), happiness: Math.max(0, m.happiness - 5), affection: Math.max(0, m.affection - 4) }))
      temporaryAction('angry', 3200, false)
      say(character === 'snake' ? 'Hiss! That is enough poking! 😠' : 'Hey! That is enough poking 😠')
      pokeTimes.current = []
      return
    }
    if (pokes >= 2) {
      temporaryAction('hurt', 1100, false)
      setMood((m) => ({ ...m, anger: Math.min(100, m.anger + 7), affection: Math.max(0, m.affection - 1) }))
      return
    }
    setOpen((value) => !value)
  }

  async function handleNextMonitor() {
    markInteraction()
    temporaryAction('walk', 2800, false)
    roaming.current = true
    try { await moveToNextMonitorBottom(2400) } finally { roaming.current = false }
  }

  function finishOnboarding(value: { character: CharacterId; ai: AiSettings; behavior: BehaviorSettings; speech: boolean }) {
    localStorage.setItem('nook.character', value.character)
    localStorage.setItem('nook.ai.v3', JSON.stringify(value.ai))
    localStorage.setItem('nook.behavior.v4', JSON.stringify(value.behavior))
    localStorage.setItem('nook.speech', String(value.speech))
    setCharacter(value.character)
    setMood(readMood(value.character))
    setAiSettings(value.ai)
    setBehavior(value.behavior)
    setSpeechEnabled(value.speech)
    setOnboardingComplete(true)
    setResponse(`${CHARACTER_DEFINITIONS[value.character].name} is ready. Click me whenever you need help.`)
    void hasCloudApiKey().then(setCloudKeyConfigured).catch(() => undefined)
    window.setTimeout(() => void syncPetWindow({ open: false, petSize }), 50)
  }

  return (
    <main className={`app-shell ${open ? 'panel-open' : ''}`}>
      {!onboardingComplete && <Onboarding initialCharacter={character} initialAi={aiSettings} initialBehavior={behavior} onFinish={finishOnboarding} />}
      {onboardingComplete && open && (
        <CommandBubble
          response={response}
          busy={busy}
          mood={mood}
          character={character}
          petSize={petSize}
          speechEnabled={speechEnabled}
          aiSettings={aiSettings}
          behavior={behavior}
          power={power}
          dayPart={dayPart}
          monitorCount={displayCount}
          effectivePerformance={effectivePerformance}
          cloudKeyConfigured={cloudKeyConfigured}
          onCloudKeyStatus={setCloudKeyConfigured}
          onSubmit={handleCommand}
          onClose={() => setOpen(false)}
          onCharacter={selectCharacter}
          onPetSize={setPetSize}
          onSpeech={setSpeechEnabled}
          onAiSettings={setAiSettings}
          onBehavior={setBehavior}
          onNextMonitor={() => void handleNextMonitor()}
        />
      )}

      {onboardingComplete && <div
        className={`pet-hitbox pet-${character} perf-${effectivePerformance} ${speaking ? 'pet-speaking' : ''}`}
        style={{ width: petSize, height: petSize }}
        onPointerDown={onPetPointerDown}
        onPointerMove={onPetPointerMove}
        onPointerUp={onPetPointerUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        <PetScene
          character={character}
          action={action}
          angry={action === 'angry' || mood.anger > 45}
          item={activeItem}
          gaze={gaze}
          speaking={speaking}
          performanceMode={effectivePerformance}
        />
        <div className="pet-shadow" />
      </div>}
    </main>
  )
}
