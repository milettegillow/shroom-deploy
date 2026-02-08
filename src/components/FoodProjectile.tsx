import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Clone } from '@react-three/drei'
import * as THREE from 'three'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { mushroomWorldPos } from '../stores/mushroomPosition'
import { THROW, FOOD_TYPES, FOOD_TYPE_KEYS } from '../constants'
import { screenToWorld } from '../utils/camera'
import type { FoodType } from '../types'

const BASE_MOUTH = new THREE.Vector3(...THROW.mouthPos)
const MOUTH = new THREE.Vector3()

const SIMPLE_GEOMETRIES: Partial<Record<FoodType, React.JSX.Element>> = {
  compost: <dodecahedronGeometry args={[0.8]} />,
}

const GLB_FOOD_KEYS: FoodType[] = ['barkChip', 'deadLeaf', 'rottenLog']
const SIMPLE_FOOD_KEYS = FOOD_TYPE_KEYS.filter((k) => !GLB_FOOD_KEYS.includes(k))

const GULP_DURATION = 0.25

interface GulpState {
  active: boolean
  foodType: FoodType
  start: THREE.Vector3
  elapsed: number
}

export default function FoodProjectile() {
  const groupRef = useRef<THREE.Group>(null)
  const items = useRef<Record<FoodType, THREE.Object3D | null>>({} as Record<FoodType, THREE.Object3D | null>)
  const gulp = useRef<GulpState>({
    active: false, foodType: 'deadLeaf',
    start: new THREE.Vector3(), elapsed: 0,
  })
  const { camera } = useThree()
  const barkGltf = useGLTF('/bark.glb')
  const leafGltf = useGLTF('/leaf.glb')
  const logGltf = useGLTF('/log.glb')

  function showOnly(type: FoodType | null) {
    for (const key of FOOD_TYPE_KEYS)
      if (items.current[key]) items.current[key]!.visible = key === type
  }

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const gl = gulp.current

    // Gulp animation: food flies to mouth and shrinks
    if (gl.active) {
      gl.elapsed += delta
      const t = Math.min(gl.elapsed / GULP_DURATION, 1)
      const ease = t * t * (3 - 2 * t) // smoothstep
      MOUTH.copy(BASE_MOUTH).setX(BASE_MOUTH.x + mushroomWorldPos.x)
      MOUTH.setY(MOUTH.y + mushroomWorldPos.y)
      g.visible = true
      g.position.lerpVectors(gl.start, MOUTH, ease)
      g.scale.setScalar(THROW.foodScale * (1 - ease * 0.8))
      g.rotation.x += delta * 6
      showOnly(gl.foodType)
      if (t >= 1) {
        gl.active = false
        g.visible = false
        useMushroomStore.getState().feed(gl.foodType)
        useFeedingStore.getState().recordHit(gl.foodType)
      }
      return
    }

    const store = useFeedingStore.getState()

    // Dragging: food follows cursor
    if (store.isDragging && store.dragFoodType) {
      const pos = screenToWorld(
        store.dragX / window.innerWidth,
        store.dragY / window.innerHeight,
        camera,
        THROW.dragZ,
      )
      g.visible = true
      g.position.copy(pos)
      g.scale.setScalar(THROW.foodScale)
      g.rotation.set(0, 0, 0)
      showOnly(store.dragFoodType)
      return
    }

    // Check for drop
    const req = store.consumeDropRequest()
    if (req) {
      MOUTH.copy(BASE_MOUTH).setX(BASE_MOUTH.x + mushroomWorldPos.x)
      const dropPos = screenToWorld(req.nx, req.ny, camera, MOUTH.z)
      if (dropPos.distanceTo(MOUTH) < THROW.hitRadius) {
        // Start gulp animation toward mouth
        gl.active = true
        gl.foodType = req.foodType
        gl.start.copy(screenToWorld(req.nx, req.ny, camera, THROW.dragZ))
        gl.elapsed = 0
        return
      } else {
        useFeedingStore.getState().recordMiss()
      }
    }

    g.visible = false
  })

  return (
    <group ref={groupRef} visible={false} scale={THROW.foodScale}>
      {SIMPLE_FOOD_KEYS.map((type) => (
        <mesh key={type} ref={(el) => { items.current[type] = el }} visible={false}>
          {SIMPLE_GEOMETRIES[type]}
          <meshStandardMaterial color={FOOD_TYPES[type].color} />
        </mesh>
      ))}
      <group ref={(el) => { items.current.barkChip = el }} visible={false} scale={0.08} rotation={[0.4, 0.3, 0]}>
        <Clone object={barkGltf.scene} />
      </group>
      <group ref={(el) => { items.current.deadLeaf = el }} visible={false} scale={15.0} rotation={[0.4, 0.3, 0]}>
        <Clone object={leafGltf.scene} />
      </group>
      <group ref={(el) => { items.current.rottenLog = el }} visible={false} scale={5.0} rotation={[0.4, 0.3, 0]}>
        <Clone object={logGltf.scene} />
      </group>
    </group>
  )
}
