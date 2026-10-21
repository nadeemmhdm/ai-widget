import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { PetCharacterProps } from './shared'

export function Panda({ action, angry, gaze, speaking }: PetCharacterProps) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!root.current) return
    const t = state.clock.elapsedTime
    const r = root.current
    const la = leftArm.current; const ra = rightArm.current; const ll = leftLeg.current; const rl = rightLeg.current
    r.rotation.z *= .82; r.rotation.y *= .84; r.position.y *= .82
    if (head.current && action !== 'sleep') {
      head.current.rotation.y += (gaze.x * .2 - head.current.rotation.y) * .08
      head.current.rotation.x += (-gaze.y * .11 - head.current.rotation.x) * .08
    }
    if (mouth.current) mouth.current.scale.y += ((speaking ? .55 + Math.abs(Math.sin(t * 10.5)) * .8 : .26) - mouth.current.scale.y) * .22
    if (la) { la.rotation.x *= .82; la.rotation.z *= .82 }
    if (ra) { ra.rotation.x *= .82; ra.rotation.z *= .82 }
    if (ll) ll.rotation.x *= .82
    if (rl) rl.rotation.x *= .82

    if (action === 'walk') {
      const s = Math.sin(t * 7); r.rotation.z = s * .055; r.position.y = Math.abs(Math.sin(t * 7)) * .055
      if (la) la.rotation.x = s * .5; if (ra) ra.rotation.x = -s * .5; if (ll) ll.rotation.x = -s * .35; if (rl) rl.rotation.x = s * .35
    } else if (action === 'dance') {
      r.rotation.z = Math.sin(t * 6.5) * .3; r.position.y = Math.abs(Math.sin(t * 6.5)) * .13
      if (la) la.rotation.z = 1.2; if (ra) ra.rotation.z = -1.2
    } else if (action === 'eat') {
      if (la) la.rotation.x = -1.25 + Math.sin(t * 6) * .12; if (ra) ra.rotation.x = -1.25 - Math.sin(t * 6) * .12
      r.rotation.z = Math.sin(t * 3) * .025
    } else if (action === 'play') { r.rotation.y = Math.sin(t * 5) * .22; r.position.y = Math.abs(Math.sin(t * 7)) * .09 }
    else if (action === 'sleep') { r.rotation.z = -.52; r.position.y = -.46 }
    else if (action === 'angry') { if (la) la.rotation.z = -.9; if (ra) ra.rotation.z = .9; r.rotation.y = Math.sin(t * 6) * .06 }
    else if (action === 'hurt') r.rotation.z = Math.sin(t * 20) * .08
    else if (action === 'wave') { if (ra) ra.rotation.z = -1.3 + Math.sin(t * 9) * .3 }
    else if (action === 'happy') { r.position.y = Math.abs(Math.sin(t * 6)) * .1; r.rotation.z = Math.sin(t * 5) * .05 }
    else if (action === 'surprised') r.position.y = Math.abs(Math.sin(t * 9)) * .05
  })

  const black = '#202225'; const white = '#f3f0e9'; const eyeScaleY = angry ? .52 : action === 'happy' || action === 'eat' ? .72 : 1
  return (
    <group ref={root} position={[0, -.48, 0]}>
      <mesh position={[0, .25, 0]} scale={[.98, 1.08, .78]}><sphereGeometry args={[.82, 32, 32]} /><meshStandardMaterial color={white} roughness={.95} /></mesh>
      <group ref={head} position={[0, 1.25, .02]}>
        <mesh scale={[1, .93, .88]}><sphereGeometry args={[.75, 32, 32]} /><meshStandardMaterial color={white} roughness={.95} /></mesh>
        {[-.52, .52].map((x) => <mesh key={x} position={[x, .4, -.04]}><sphereGeometry args={[.28, 22, 22]} /><meshStandardMaterial color={black} roughness={.9} /></mesh>)}
        {[-.28, .28].map((x) => (
          <group key={x} position={[x, .18, .55]} rotation={[0, 0, x < 0 ? -.22 : .22]}>
            <mesh scale={[1.5, 1.15, .45]}><sphereGeometry args={[.14, 18, 18]} /><meshStandardMaterial color={black} roughness={.9} /></mesh>
            <mesh position={[gaze.x * .018, -gaze.y * .014, .075]} scale={[.63, .63 * eyeScaleY, .35]}><sphereGeometry args={[.1, 16, 16]} /><meshStandardMaterial color="#121416" /></mesh>
            <mesh position={[-.018 + gaze.x * .014, .025 - gaze.y * .01, .113]} scale={.18}><sphereGeometry args={[.09, 10, 10]} /><meshBasicMaterial color="white" /></mesh>
          </group>
        ))}
        <mesh position={[0, -.13, .67]} scale={[1, .74, .62]}><sphereGeometry args={[.28, 22, 22]} /><meshStandardMaterial color="#f7f4ee" /></mesh>
        <mesh position={[0, -.03, .84]} scale={[1, .7, .55]}><sphereGeometry args={[.105, 18, 18]} /><meshStandardMaterial color={black} /></mesh>
        <mesh ref={mouth} position={[0, -.27, .82]} scale={[.8, .26, .26]}><torusGeometry args={[.08, .016, 8, 20, Math.PI]} /><meshStandardMaterial color={black} /></mesh>
      </group>
      <group ref={leftArm} position={[-.73, .42, .02]} rotation={[0, 0, .28]}><mesh position={[0,-.28,0]} scale={[.58,1.07,.6]}><sphereGeometry args={[.42, 24, 24]} /><meshStandardMaterial color={black} /></mesh></group>
      <group ref={rightArm} position={[.73,.42,.02]} rotation={[0,0,-.28]}><mesh position={[0,-.28,0]} scale={[.58,1.07,.6]}><sphereGeometry args={[.42,24,24]} /><meshStandardMaterial color={black} /></mesh></group>
      <group ref={leftLeg} position={[-.38,-.42,.05]}><mesh position={[0,-.25,0]} scale={[.78,.95,.78]}><sphereGeometry args={[.42,24,24]} /><meshStandardMaterial color={black} /></mesh></group>
      <group ref={rightLeg} position={[.38,-.42,.05]}><mesh position={[0,-.25,0]} scale={[.78,.95,.78]}><sphereGeometry args={[.42,24,24]} /><meshStandardMaterial color={black} /></mesh></group>
    </group>
  )
}
