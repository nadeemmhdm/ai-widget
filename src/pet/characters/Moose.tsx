import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { PetCharacterProps } from './shared'

function Antler({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * .42, .38, -.03]} rotation={[0, 0, side * -.15]}>
      <mesh rotation={[0,0,side * -.34]}><capsuleGeometry args={[.065,.5,8,16]} /><meshStandardMaterial color="#d7bd91" roughness={.8} /></mesh>
      <mesh position={[side * .18,.23,0]} rotation={[0,0,side * -.85]}><capsuleGeometry args={[.055,.28,8,16]} /><meshStandardMaterial color="#d7bd91" /></mesh>
      <mesh position={[side * .28,.36,0]} rotation={[0,0,side * -1.0]}><capsuleGeometry args={[.05,.23,8,16]} /><meshStandardMaterial color="#d7bd91" /></mesh>
    </group>
  )
}

export function Moose({ action, angry, gaze, speaking }: PetCharacterProps) {
  const root = useRef<THREE.Group>(null)
  const legs = useRef<Array<THREE.Group | null>>([])
  const head = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!root.current) return
    const t = state.clock.elapsedTime
    const r = root.current
    r.rotation.z *= .84; r.position.y *= .84
    legs.current.forEach((l) => { if (l) l.rotation.x *= .8 })
    if (head.current) {
      head.current.rotation.z *= .82; head.current.rotation.x *= .84; head.current.rotation.y *= .84
      if (action !== 'sleep') {
        head.current.rotation.y += gaze.x * .18 * .12
        head.current.rotation.x += -gaze.y * .1 * .12
      }
    }
    if (mouth.current) mouth.current.scale.y += ((speaking ? .75 + Math.abs(Math.sin(t * 10)) * .65 : .55) - mouth.current.scale.y) * .2

    if (action === 'walk') {
      r.position.y = Math.abs(Math.sin(t * 7)) * .055
      legs.current.forEach((l, i) => { if (l) l.rotation.x = Math.sin(t * 7 + (i % 2) * Math.PI) * .34 })
    } else if (action === 'dance') {
      r.rotation.z = Math.sin(t * 6) * .18; r.position.y = Math.abs(Math.sin(t * 6)) * .12
      if (head.current) head.current.rotation.z = Math.sin(t * 8) * .2
    } else if (action === 'eat') { if (head.current) head.current.rotation.x = .65 + Math.sin(t * 4) * .05 }
    else if (action === 'play') { r.position.y = Math.abs(Math.sin(t * 7)) * .1; if (head.current) head.current.rotation.z = Math.sin(t * 6) * .18 }
    else if (action === 'sleep') { r.position.y = -.35; r.rotation.z = -.12; if (head.current) head.current.rotation.x = .38 }
    else if (action === 'angry') { if (head.current) head.current.rotation.z = Math.sin(t * 8) * .07; r.position.y = Math.abs(Math.sin(t * 9)) * .035 }
    else if (action === 'hurt') r.rotation.z = Math.sin(t * 22) * .06
    else if (action === 'happy') r.position.y = Math.abs(Math.sin(t * 6)) * .08
    else if (action === 'wave') { if (head.current) head.current.rotation.z = Math.sin(t * 7) * .2 }
    else if (action === 'surprised') { if (head.current) head.current.rotation.x = -.16 }
  })

  const brown = '#8b6549'; const dark = '#5f4436'
  return (
    <group ref={root} position={[0,-.43,0]} scale={.92}>
      <mesh position={[0,.35,0]} scale={[.88,1.02,.72]}><sphereGeometry args={[.78,30,30]} /><meshStandardMaterial color={brown} roughness={.92} /></mesh>
      <group ref={head} position={[0,1.25,.08]}>
        <mesh scale={[.78,.86,.72]}><sphereGeometry args={[.66,30,30]} /><meshStandardMaterial color={brown} roughness={.92} /></mesh>
        <mesh position={[0,-.22,.55]} scale={[.7,.62,.7]}><sphereGeometry args={[.45,24,24]} /><meshStandardMaterial color="#b18b68" /></mesh>
        <mesh position={[0,-.15,.82]} scale={[1,.55,.5]}><sphereGeometry args={[.13,16,16]} /><meshStandardMaterial color={dark} /></mesh>
        {[-.23,.23].map((x) => <mesh key={x} position={[x + gaze.x * .012,.12 - gaze.y * .01,.53]} scale={[1, angry ? .5 : 1, 1]}><sphereGeometry args={[.07,14,14]} /><meshStandardMaterial color="#171515" /></mesh>)}
        <mesh position={[-.58,.13,.05]} rotation={[0,0,.35]} scale={[.9,.45,.48]}><sphereGeometry args={[.28,18,18]} /><meshStandardMaterial color={brown} /></mesh>
        <mesh position={[.58,.13,.05]} rotation={[0,0,-.35]} scale={[.9,.45,.48]}><sphereGeometry args={[.28,18,18]} /><meshStandardMaterial color={brown} /></mesh>
        <mesh ref={mouth} position={[0,-.37,.77]} scale={[.7,.55,.28]}><torusGeometry args={[.08,.016,8,20,Math.PI]} /><meshStandardMaterial color={dark} /></mesh>
        <Antler side={-1} /><Antler side={1} />
      </group>
      {[-.42,.42].flatMap((x, xi) => [-.15,.34].map((z, zi) => {
        const i = xi * 2 + zi
        return <group key={`${x}-${z}`} ref={(el) => { legs.current[i] = el }} position={[x,-.23,z]}><mesh position={[0,-.42,0]} scale={[.34,1.1,.34]}><capsuleGeometry args={[.2,.55,8,16]} /><meshStandardMaterial color={dark} /></mesh></group>
      }))}
    </group>
  )
}
