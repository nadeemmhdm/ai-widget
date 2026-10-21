import { Canvas, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { ActivePetItem, CharacterId, GazeVector, PerformanceMode, PetAction } from '../types/pet'
import { Bear } from './characters/Bear'
import { Panda } from './characters/Panda'
import { Snake } from './characters/Snake'
import { Moose } from './characters/Moose'
import { PetProp } from './props/PetProp'
import type { PetCharacterProps } from './characters/shared'

function Character({ character, ...props }: { character: CharacterId } & PetCharacterProps) {
  if (character === 'panda') return <Panda {...props} />
  if (character === 'snake') return <Snake {...props} />
  if (character === 'moose') return <Moose {...props} />
  return <Bear {...props} />
}

function FrameDriver({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    const timer = window.setInterval(() => invalidate(), Math.max(16, Math.round(1000 / fps)))
    return () => window.clearInterval(timer)
  }, [fps, invalidate])
  return null
}

export function PetScene({
  character,
  action,
  angry,
  item,
  gaze,
  speaking,
  performanceMode,
}: {
  character: CharacterId
  action: PetAction
  angry: boolean
  item: ActivePetItem
  gaze: GazeVector
  speaking: boolean
  performanceMode: Exclude<PerformanceMode, 'auto'>
}) {
  const dpr: [number, number] = performanceMode === 'quality' ? [1, 2] : performanceMode === 'balanced' ? [1, 1.4] : [1, 1]
  const fps = performanceMode === 'quality' ? 60 : performanceMode === 'balanced' ? 40 : 24
  return (
    <Canvas
      camera={{ position: [0, 0.55, 4.7], fov: 36 }}
      gl={{ alpha: true, antialias: performanceMode !== 'battery', powerPreference: performanceMode === 'battery' ? 'low-power' : 'high-performance' }}
      dpr={dpr}
      frameloop="demand"
      performance={{ min: performanceMode === 'battery' ? .35 : .55, max: 1, debounce: 180 }}
      style={{ background: 'transparent' }}
    >
      <FrameDriver fps={fps} />
      <ambientLight intensity={performanceMode === 'battery' ? 1.7 : 2.0} />
      <directionalLight position={[3, 5, 4]} intensity={performanceMode === 'battery' ? 1.8 : 2.2} />
      {performanceMode !== 'battery' && <directionalLight position={[-3, 2, 2]} intensity={0.7} />}
      <Character character={character} action={action} angry={angry} gaze={gaze} speaking={speaking} />
      <PetProp item={item} />
    </Canvas>
  )
}
