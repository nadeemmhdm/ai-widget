import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PetCharacterProps } from './shared'

function Eye({ x, angry, happy, gazeX, gazeY }: { x: number; angry: boolean; happy: boolean; gazeX: number; gazeY: number }) {
  return (
    <group position={[x, .18, .53]} rotation={[0, 0, angry ? (x < 0 ? -0.23 : 0.23) : 0]}>
      <mesh scale={[1, angry ? 0.5 : happy ? 0.7 : 1, 1]}>
        <sphereGeometry args={[0.085, 18, 18]} />
        <meshStandardMaterial color="#181513" roughness={0.35} />
      </mesh>
      <mesh position={[-0.022 + gazeX * .015, 0.025 - gazeY * .012, 0.067]} scale={0.28}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  )
}

export function Bear({ action, angry, gaze, speaking }: PetCharacterProps) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const seed = useMemo(() => Math.random() * 20, [])

  useFrame((state) => {
    const r = root.current
    if (!r) return
    const t = state.clock.elapsedTime + seed
    const swing = Math.sin(t * (action === 'walk' ? 8 : 3))

    r.scale.set(1, 1 + Math.sin(t * 2.1) * 0.014, 1)
    r.rotation.z *= 0.82
    r.rotation.y *= 0.84
    r.position.y *= 0.82

    if (head.current && action !== 'sleep') {
      head.current.rotation.y += (gaze.x * .22 - head.current.rotation.y) * .08
      head.current.rotation.x += (-gaze.y * .12 - head.current.rotation.x) * .08
    }
    if (mouth.current) {
      const talk = speaking ? .55 + Math.abs(Math.sin(t * 11)) * .85 : 0.3
      mouth.current.scale.y += (talk - mouth.current.scale.y) * .2
    }

    const la = leftArm.current
    const ra = rightArm.current
    const ll = leftLeg.current
    const rl = rightLeg.current
    if (la) { la.rotation.x *= 0.82; la.rotation.z *= 0.82 }
    if (ra) { ra.rotation.x *= 0.82; ra.rotation.z *= 0.82 }
    if (ll) ll.rotation.x *= 0.82
    if (rl) rl.rotation.x *= 0.82

    if (action === 'walk') {
      if (la) la.rotation.x = swing * 0.65
      if (ra) ra.rotation.x = -swing * 0.65
      if (ll) ll.rotation.x = -swing * 0.5
      if (rl) rl.rotation.x = swing * 0.5
      r.position.y = Math.abs(Math.sin(t * 8)) * 0.07
    } else if (action === 'dance') {
      r.rotation.z = Math.sin(t * 7) * 0.23
      r.position.y = Math.abs(Math.sin(t * 7)) * 0.14
      if (la) la.rotation.z = 1.15 + Math.sin(t * 8) * 0.55
      if (ra) ra.rotation.z = -1.15 - Math.sin(t * 8) * 0.55
    } else if (action === 'hurt') {
      r.rotation.z = Math.sin(t * 22) * 0.07
      r.position.y = 0.05
    } else if (action === 'angry') {
      if (la) la.rotation.z = -0.75
      if (ra) ra.rotation.z = 0.75
      r.rotation.y = Math.sin(t * 5) * 0.07
    } else if (action === 'sleep') {
      r.rotation.z = -0.43
      r.position.y = -0.42
    } else if (action === 'eat') {
      if (la) la.rotation.x = -1.15 + Math.sin(t * 5) * 0.14
      if (ra) ra.rotation.x = -1.15 - Math.sin(t * 5) * 0.14
    } else if (action === 'play') {
      r.rotation.z = Math.sin(t * 5) * 0.11
      r.position.y = Math.abs(Math.sin(t * 6)) * 0.08
      if (la) la.rotation.x = -0.8 + Math.sin(t * 6) * 0.35
      if (ra) ra.rotation.x = -0.8 - Math.sin(t * 6) * 0.35
    } else if (action === 'wave') {
      if (ra) ra.rotation.z = -1.25 + Math.sin(t * 9) * 0.3
    } else if (action === 'happy') {
      r.position.y = Math.abs(Math.sin(t * 6)) * 0.1
    } else if (action === 'surprised') {
      r.scale.setScalar(1 + Math.abs(Math.sin(t * 8)) * 0.035)
    }
  })

  const fur = '#aa7452'
  const muzzle = '#e0b795'
  const happy = action === 'happy' || action === 'eat' || action === 'play'

  return (
    <group ref={root} position={[0, -0.45, 0]}>
      <mesh position={[0, 0.25, 0]} scale={[0.96, 1.05, 0.74]}><sphereGeometry args={[0.82, 32, 32]} /><meshStandardMaterial color={fur} roughness={0.92} /></mesh>
      <group ref={head} position={[0, 1.25, .03]}>
        <mesh scale={[1, .92, .88]}><sphereGeometry args={[.75, 32, 32]} /><meshStandardMaterial color={fur} roughness={.92} /></mesh>
        {[-0.52, 0.52].map((x) => (
          <group key={x} position={[x, .33, -.03]}>
            <mesh><sphereGeometry args={[0.28, 22, 22]} /><meshStandardMaterial color="#9a6546" roughness={0.9} /></mesh>
            <mesh position={[0, 0, 0.18]} scale={0.58}><sphereGeometry args={[0.25, 18, 18]} /><meshStandardMaterial color="#d89b83" roughness={0.95} /></mesh>
          </group>
        ))}
        <mesh position={[0, -.17, .55]} scale={[1.0, .78, .72]}><sphereGeometry args={[.34, 24, 24]} /><meshStandardMaterial color={muzzle} roughness={.96} /></mesh>
        <mesh position={[0, -.03, .76]} scale={[1.0, .72, .55]}><sphereGeometry args={[.12, 18, 18]} /><meshStandardMaterial color="#3a2822" roughness={.55} /></mesh>
        <Eye x={-.27} angry={angry} happy={happy} gazeX={gaze.x} gazeY={gaze.y} />
        <Eye x={.27} angry={angry} happy={happy} gazeX={gaze.x} gazeY={gaze.y} />
        <mesh ref={mouth} position={[0, -.27, .76]} scale={[1.1, .3, .28]}>
          <torusGeometry args={[.09, .018, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#4b3029" />
        </mesh>
      </group>
      <group ref={leftArm} position={[-0.75, 0.4, 0.02]} rotation={[0, 0, 0.28]}><mesh position={[0, -0.28, 0]} scale={[0.56, 1.05, 0.58]}><sphereGeometry args={[0.42, 24, 24]} /><meshStandardMaterial color={fur} roughness={0.92} /></mesh></group>
      <group ref={rightArm} position={[0.75, 0.4, 0.02]} rotation={[0, 0, -0.28]}><mesh position={[0, -0.28, 0]} scale={[0.56, 1.05, 0.58]}><sphereGeometry args={[0.42, 24, 24]} /><meshStandardMaterial color={fur} roughness={0.92} /></mesh></group>
      <group ref={leftLeg} position={[-0.38, -0.42, 0.05]}><mesh position={[0, -0.25, 0]} scale={[0.75, 0.95, 0.75]}><sphereGeometry args={[0.42, 24, 24]} /><meshStandardMaterial color={fur} roughness={0.92} /></mesh></group>
      <group ref={rightLeg} position={[0.38, -0.42, 0.05]}><mesh position={[0, -0.25, 0]} scale={[0.75, 0.95, 0.75]}><sphereGeometry args={[0.42, 24, 24]} /><meshStandardMaterial color={fur} roughness={0.92} /></mesh></group>
    </group>
  )
}
