import type { DayPart, PerformanceMode, PetAction, PetMood, PowerStatus } from '../types/pet'

export function dayPartFor(date = new Date()): DayPart {
  const hour = date.getHours()
  if (hour >= 6 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 18) return 'day'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export function effectivePerformanceMode(mode: PerformanceMode, power: PowerStatus): Exclude<PerformanceMode, 'auto'> {
  if (mode !== 'auto') return mode
  if (power.batterySaverRecommended) return 'battery'
  if (power.onAcPower === false) return 'balanced'
  return 'quality'
}

export function chooseAutonomousAction(mood: PetMood, dayPart: DayPart): PetAction {
  if (dayPart === 'night' && (mood.sleepiness > 48 || mood.energy < 45)) return 'sleep'
  if (mood.energy < 24 || mood.sleepiness > 84) return 'sleep'
  if (mood.anger > 55) return 'angry'
  if (mood.boredom > 72) return Math.random() < .55 ? 'play' : 'walk'
  if (mood.happiness > 78 && Math.random() < .35) return 'dance'
  const pool: PetAction[] = dayPart === 'morning'
    ? ['wave', 'walk', 'happy', 'idle', 'walk']
    : dayPart === 'evening'
      ? ['walk', 'play', 'happy', 'idle', 'wave']
      : ['walk', 'idle', 'happy', 'play', 'wave']
  return pool[Math.floor(Math.random() * pool.length)]
}
