import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { ActivePetItem } from '../../types/pet'

function FoodModel({ id }: { id: string }) {
  if (id === 'bamboo') {
    return (
      <group rotation={[0, 0, -.28]}>
        <mesh><cylinderGeometry args={[.055,.065,.82,12]} /><meshStandardMaterial color="#61a84f" /></mesh>
        {[-.22,.05,.28].map((y) => <mesh key={y} position={[0,y,0]}><torusGeometry args={[.058,.012,6,12]} /><meshStandardMaterial color="#3c7f39" /></mesh>)}
        <mesh position={[.15,.18,0]} rotation={[0,0,-.7]} scale={[1.5,.6,.4]}><sphereGeometry args={[.1,12,12]} /><meshStandardMaterial color="#77be5f" /></mesh>
      </group>
    )
  }
  if (id === 'honey') {
    return (
      <group>
        <mesh><cylinderGeometry args={[.18,.15,.28,18]} /><meshStandardMaterial color="#d89b35" /></mesh>
        <mesh position={[0,.16,0]}><torusGeometry args={[.13,.028,8,18]} /><meshStandardMaterial color="#6e472d" /></mesh>
      </group>
    )
  }
  if (id === 'egg') {
    return <mesh scale={[.78,1,.78]}><sphereGeometry args={[.22,20,20]} /><meshStandardMaterial color="#f3ead6" roughness={.86} /></mesh>
  }
  if (id === 'leaves') {
    return (
      <group>
        {[-.16,0,.16].map((x, i) => <mesh key={x} position={[x, i === 1 ? .12 : 0, 0]} rotation={[0,0,x * 2.2]} scale={[1,.55,.35]}><sphereGeometry args={[.16,14,14]} /><meshStandardMaterial color={i === 1 ? '#5b9b4a' : '#70ad55'} /></mesh>)}
      </group>
    )
  }
  return <mesh><sphereGeometry args={[.2,18,18]} /><meshStandardMaterial color="#e5b74c" /></mesh>
}

function ToyModel({ id }: { id: string }) {
  if (id === 'pinecone') {
    return (
      <group>
        <mesh scale={[.7,1,.7]}><sphereGeometry args={[.22,12,12]} /><meshStandardMaterial color="#7c5436" roughness={1} /></mesh>
        {[0,.8,1.6,2.4].map((r) => <mesh key={r} rotation={[0,0,r]} scale={[1,.4,.65]}><torusGeometry args={[.17,.035,6,10]} /><meshStandardMaterial color="#9c6b43" /></mesh>)}
      </group>
    )
  }
  const color = id === 'green-ball' ? '#63b868' : id === 'rattle-ball' ? '#56a8d9' : '#e36f6f'
  return (
    <group>
      <mesh><sphereGeometry args={[.22,22,22]} /><meshStandardMaterial color={color} roughness={.65} metalness={.05} /></mesh>
      <mesh rotation={[Math.PI / 2,0,0]}><torusGeometry args={[.15,.018,8,20]} /><meshStandardMaterial color="#f3f3f3" /></mesh>
    </group>
  )
}

export function PetProp({ item }: { item: ActivePetItem }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current || !item) return
    const t = state.clock.elapsedTime
    group.current.position.y = -.74 + Math.abs(Math.sin(t * 4.5)) * .04
    group.current.rotation.y += item.kind === 'toy' ? .025 : .008
    if (item.kind === 'toy') group.current.position.x = .78 + Math.sin(t * 2.8) * .13
  })
  if (!item) return null

  return (
    <group ref={group} position={[.78,-.74,.55]} scale={.88}>
      {item.kind === 'food' ? <FoodModel id={item.id} /> : <ToyModel id={item.id} />}
    </group>
  )
}
