import type { CharacterId } from '../types/pet'
import { runAgent, type AgentResponse } from './native'

export type AiSettings = {
  mode: 'local' | 'cloud' | 'auto'
  localModel: string
  cloudModel: string
}

export async function askAi(prompt: string, settings: AiSettings, character: CharacterId): Promise<AgentResponse> {
  return runAgent({ prompt, ...settings, character })
}
