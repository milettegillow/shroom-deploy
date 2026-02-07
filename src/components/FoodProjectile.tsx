import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { THROW, FOOD_TYPES, FOOD_TYPE_KEYS } from '../constants'
import { screenToWorld } from '../utils/camera'
import type { FoodType, ThrowRequest } from '../types'

const MOUTH = new THREE.Vector3(...THROW.mouthPos)

const GEOMETRIES: Record<FoodType, React.JSX.Element> = {
  deadLeaf:  <sphereGeometry args={[1, 8, 4]} />,
  rottenLog: <cylinderGeometry args={[0.4, 0.4, 2, 8]} />,
  compost:   <dodecahedronGeometry args={[0.8]} />,
  barkChip:  <boxGeometry args={[1.5, 0.3, 1]} />,
}

interface Projectile {
  active: boolean
  foodType: FoodType
  pos: THREE.Vector3
  vel: THREE.Vector3
  elapsed: number
}

export default function FoodProjectile() {
  const groupRef = useRef<THREE.Group>(null)
  const meshes = useRef<Record<FoodType, THREE.Mesh | null>>({} as Record<FoodType, THREE.Mesh | null>)
  const proj = useRef<Projectile>({
    active: false, foodType: 'deadLeaf',
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), elapsed: 0,
  })
  const { camera } = useThree()

  function showOnly(type: FoodType | null) {
    for (const key of FOOD_TYPE_KEYS)
      if (meshes.current[key]) meshes.current[key]!.visible = key === type
  }

  function launch(req: ThrowRequest) {
    const p = proj.current
    Object.assign(p, { active: true, foodType: req.foodType, elapsed: 0 })
    p.pos.copy(screenToWorld(req.nx, req.ny, camera, THROW.dragZ))
    p.vel.set(req.vx * THROW.speedScale, -req.vy * THROW.speedScale, -THROW.zSpeed)
    groupRef.current!.position.copy(p.pos)
    groupRef.current!.rotation.set(0, 0, 0)
  }

  function resolve(outcome: 'hit' | 'miss') {
    const foodType = proj.current.foodType
    proj.current.active = false
    groupRef.current!.visible = false
    if (outcome === 'hit') {
      useMushroomStore.getState().feed(foodType)
      useFeedingStore.getState().recordHit(foodType)
    } else {
      useFeedingStore.getState().recordMiss()
    }
  }

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const p = proj.current
    const store = useFeedingStore.getState()

    if (store.isDragging && store.dragFoodType) {
      const pos = screenToWorld(store.dragX / window.innerWidth, store.dragY / window.innerHeight, camera, THROW.dragZ)
      g.visible = true
      g.position.copy(pos)
      g.rotation.set(0, 0, 0)
      g.scale.setScalar(THROW.foodScale)
      showOnly(store.dragFoodType)
      return
    }

    if (!p.active) {
      const req = store.consumeThrowRequest()
      if (!req) { g.visible = false; return }
      launch(req)
    }
    if (!p.active) return

    p.vel.y -= THROW.gravity * delta
    p.pos.addScaledVector(p.vel, delta)
    p.elapsed += delta
    g.visible = true
    g.position.copy(p.pos)
    g.rotation.x += delta * 8
    g.rotation.z += delta * 5

    if (p.pos.distanceTo(MOUTH) < THROW.hitRadius) return resolve('hit')
    if (p.pos.y < THROW.offscreenY || p.elapsed > THROW.maxFlight) return resolve('miss')
  })

  return (
    <group ref={groupRef} visible={false} scale={THROW.foodScale}>
      {FOOD_TYPE_KEYS.map((type) => (
        <mesh key={type} ref={(el) => { meshes.current[type] = el }} visible={false}>
          {GEOMETRIES[type]}
          <meshStandardMaterial color={FOOD_TYPES[type].color} />
        </mesh>
      ))}
    </group>
  )
}
