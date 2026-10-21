import type { GazeVector, PetAction } from '../../types/pet'

export type PetCharacterProps = {
  action: PetAction
  angry: boolean
  gaze: GazeVector
  speaking: boolean
}
