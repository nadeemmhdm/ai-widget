import type { PetAction } from '../../types/pet'

/**
 * Shared animation contract for future artist-authored GLB character packs.
 * A rigged GLB can expose any of these clip aliases. The procedural Phase 2
 * characters implement the same logical states in code, so swapping a model
 * does not require changing the assistant or interaction layer.
 */
export const ANIMATION_ALIASES: Record<PetAction, string[]> = {
  idle: ['Idle', 'idle', 'BreathingIdle'],
  walk: ['Walk', 'walk', 'Slither', 'Trot'],
  dance: ['Dance', 'dance'],
  hurt: ['Hurt', 'hurt', 'HitReaction'],
  angry: ['Angry', 'angry'],
  sleep: ['Sleep', 'sleep'],
  happy: ['Happy', 'happy', 'Celebrate'],
  eat: ['Eat', 'eat'],
  play: ['Play', 'play'],
  wave: ['Wave', 'wave'],
  surprised: ['Surprised', 'surprised'],
}

export const CHARACTER_MODEL_PATHS = {
  bear: '/characters/bear/bear.glb',
  panda: '/characters/panda/panda.glb',
  snake: '/characters/snake/snake.glb',
  moose: '/characters/moose/moose.glb',
} as const
