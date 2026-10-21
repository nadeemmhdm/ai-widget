export type CharacterId = 'bear' | 'panda' | 'snake' | 'moose'

export type PetAction =
  | 'idle'
  | 'walk'
  | 'dance'
  | 'hurt'
  | 'angry'
  | 'sleep'
  | 'happy'
  | 'eat'
  | 'play'
  | 'wave'
  | 'surprised'

export type PetItemKind = 'food' | 'toy'
export type PerformanceMode = 'auto' | 'quality' | 'balanced' | 'battery'
export type RoamMode = 'off' | 'current-monitor' | 'all-monitors'
export type DayPart = 'morning' | 'day' | 'evening' | 'night'

export type BehaviorSettings = {
  autonomous: boolean
  cursorTracking: boolean
  roamMode: RoamMode
  performanceMode: PerformanceMode
  quietAtNight: boolean
}

export type PowerStatus = {
  onAcPower: boolean | null
  batteryPercent: number | null
  batterySaverRecommended: boolean
}

export type GazeVector = { x: number; y: number; proximity: number }

export type ActivePetItem = {
  kind: PetItemKind
  id: string
  label: string
} | null

export type PetMood = {
  happiness: number
  hunger: number
  energy: number
  anger: number
  affection: number
  boredom: number
  sleepiness: number
}

export type CharacterDefinition = {
  id: CharacterId
  name: string
  emoji: string
  movementLabel: string
  favoriteFood: { id: string; label: string; emoji: string }
  favoriteToy: { id: string; label: string; emoji: string }
  description: string
}

export type StoredTodo = {
  id: string
  text: string
  done: boolean
  createdAt: string
  dueAt?: string | null
}

export type StoredNote = {
  id: string
  text: string
  createdAt: string
}
