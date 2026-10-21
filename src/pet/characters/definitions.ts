import type { CharacterDefinition, CharacterId } from '../../types/pet'

export const CHARACTER_DEFINITIONS: Record<CharacterId, CharacterDefinition> = {
  bear: {
    id: 'bear',
    name: 'Bear',
    emoji: '🐻',
    movementLabel: 'walk',
    favoriteFood: { id: 'honey', label: 'Honey', emoji: '🍯' },
    favoriteToy: { id: 'ball', label: 'Ball', emoji: '⚽' },
    description: 'Warm, cuddly and a little dramatic.',
  },
  panda: {
    id: 'panda',
    name: 'Panda',
    emoji: '🐼',
    movementLabel: 'waddle',
    favoriteFood: { id: 'bamboo', label: 'Bamboo', emoji: '🎋' },
    favoriteToy: { id: 'green-ball', label: 'Green Ball', emoji: '🟢' },
    description: 'Sleepy, playful and obsessed with bamboo.',
  },
  snake: {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    movementLabel: 'slither',
    favoriteFood: { id: 'egg', label: 'Egg', emoji: '🥚' },
    favoriteToy: { id: 'rattle-ball', label: 'Rattle Ball', emoji: '🔵' },
    description: 'Curious, smooth-moving and expressive.',
  },
  moose: {
    id: 'moose',
    name: 'Moose',
    emoji: '🫎',
    movementLabel: 'trot',
    favoriteFood: { id: 'leaves', label: 'Leaves', emoji: '🍃' },
    favoriteToy: { id: 'pinecone', label: 'Pinecone', emoji: '🌰' },
    description: 'Gentle, goofy and proudly antlered.',
  },
}

export const CHARACTER_IDS = Object.keys(CHARACTER_DEFINITIONS) as CharacterId[]

export function getCharacterDefinition(id: CharacterId) {
  return CHARACTER_DEFINITIONS[id]
}
