import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { PetCharacterProps } from './shared'

const SEGMENTS = 14

export function Snake({ action, angry, gaze, speaking }: PetCharacterProps) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const segmentRefs = useRef<Array<THREE.Mesh | null>>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!root.current) return
    const speed = action === 'walk' ? 8.5 : action === 'dance' ? 6.5 : 3.2
    const amplitude = action === 'angry' ? .28 : action === 'dance' ? .34 : action === 'sleep' ? .08 : .2

    segmentRefs.current.forEach((segment, i) => {
      if (!segment) return
      const p = i / (SEGMENTS - 1)
      const x = .82 - p * 1.7
      const yBase = -.42 + p * .1
      const wave = Math.sin(t * speed - i * .72) * amplitude * (1 - p * .3)
      segment.position.x = action === 'sleep' ? Math.cos(i * .46) * (.28 + p * .28) : x
      segment.position.y = action === 'sleep' ? -.38 + Math.sin(i * .46) * (.18 + p * .18) : yBase + Math.abs(Math.sin(t * speed - i * .5)) * .025
      segment.position.z = action === 'sleep' ? Math.sin(i * .46) * (.16 + p * .12) : wave
      segment.scale.setScalar(1 - p * .47)
    })

    if (head.current) {
      const h = head.current
      h.rotation.z *= .8; h.rotation.y *= .82; h.rotation.x *= .82; h.position.y *= .82
      if (action !== 'sleep') {
        h.rotation.y += gaze.x * .22 * .12
        h.rotation.x += -gaze.y * .13 * .12
      }
      if (action === 'walk') h.rotation.y += Math.sin(t * 8.5) * .2
      if (action === 'dance') { h.rotation.z = Math.sin(t * 7) * .35; h.position.y = Math.abs(Math.sin(t * 7)) * .15 }
      if (action === 'hurt') h.rotation.z = Math.sin(t * 24) * .13
      if (action === 'angry') h.position.y = .18 + Math.abs(Math.sin(t * 7)) * .04
      if (action === 'happy' || action === 'play') h.position.y = Math.abs(Math.sin(t * 6)) * .1
      if (action === 'eat') h.rotation.x = -.18 + Math.sin(t * 5) * .08
      if (action === 'wave') h.rotation.z = Math.sin(t * 8) * .25
      if (action === 'surprised') h.position.y = Math.abs(Math.sin(t * 10)) * .07
    }
    if (mouth.current) {
      const scale = speaking ? .7 + Math.abs(Math.sin(t * 12)) * .9 : 1
      mouth.current.scale.y += (scale - mouth.current.scale.y) * .25
    }
  })

  const body = '#54a965'; const belly = '#91ca7b'
  return (
    <group ref={root} position={[0, .2, 0]} rotation={[0, -.08, 0]}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <mesh key={i} ref={(el) => { segmentRefs.current[i] = el }} position={[.8 - i * .12, -.42, 0]}>
          <sphereGeometry args={[.29, 20, 20]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#4b9f5d' : body} roughness={.83} />
        </mesh>
      ))}
      <group ref={head} position={[.95, -.17, 0]}>
        <mesh scale={[1.05, .92, .88]}><sphereGeometry args={[.48, 30, 30]} /><meshStandardMaterial color={body} roughness={.82} /></mesh>
        <mesh position={[.22, -.12, .34]} scale={[.7,.42,.32]}><sphereGeometry args={[.3,20,20]} /><meshStandardMaterial color={belly} roughness={.9} /></mesh>
        {[-.2, .2].map((z) => (
          <group key={z} position={[.33,.12,z]}>
            <mesh position={[gaze.x * .012, -gaze.y * .01, 0]} scale={[1, angry ? .48 : 1, 1]}><sphereGeometry args={[.07,14,14]} /><meshStandardMaterial color="#121817" /></mesh>
            <mesh position={[.035 + gaze.x * .01,.02 - gaze.y * .008,.018]} scale={.24}><sphereGeometry args={[.06,8,8]} /><meshBasicMaterial color="white" /></mesh>
          </group>
        ))}
        <mesh ref={mouth} position={[.48,-.16,0]} rotation={[0,0,-Math.PI/2]}>
          <coneGeometry args={[.06,.22,8]} />
          <meshStandardMaterial color="#d65366" />
        </mesh>
      </group>
    </group>
  )
}
