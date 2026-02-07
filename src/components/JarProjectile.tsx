import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useFireflyStore } from '../stores/fireflyStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { THROW, JAR } from '../constants'

const MOUTH = new THREE.Vector3(...THROW.mouthPos)

function screenToWorld(nx: number, ny: number, camera: THREE.Camera, targetZ = 0) {
  const ndc = new THREE.Vector3(nx * 2 - 1, -(ny * 2 - 1), 0.5)
  ndc.unproject(camera)
  const dir = ndc.sub(camera.position).normalize()
  const t = (targetZ - camera.position.z) / dir.z
  return camera.position.clone().add(dir.multiplyScalar(t))
}

interface JarFlight {
  active: boolean
  pos: THREE.Vector3
  elapsed: number
}

export default function JarProjectile() {
  const groupRef = useRef<THREE.Group>(null)
  const flight = useRef<JarFlight>({ active: false, pos: new THREE.Vector3(), elapsed: 0 })
  const glowRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const { camera } = useThree()
  const jarCount = useFireflyStore((s) => s.jarCount)
  const phase = useFireflyStore((s) => s.phase)

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const store = useFireflyStore.getState()
    const f = flight.current

    const isDragging = store.phase === 'scooping' || store.phase === 'gifting'

    if (isDragging) {
      const pos = screenToWorld(
        store.dragX / window.innerWidth,
        store.dragY / window.innerHeight,
        camera,
        JAR.dragZ,
      )
      g.visible = true
      g.position.copy(pos)
      g.scale.setScalar(JAR.jarScale)

      const count = store.jarCount
      if (glowRef.current) {
        glowRef.current.emissiveIntensity = 0.5 + count * 0.5
        glowRef.current.opacity = Math.min(0.95, 0.5 + count * 0.06)
      }
      if (lightRef.current) {
        lightRef.current.intensity = 0.4 + count * 0.6
        lightRef.current.distance = 2 + count * 0.5
      }
      return
    }

    if (!f.active) {
      const req = store.consumeGiftRequest()
      if (!req) { g.visible = false; return }
      f.active = true
      f.elapsed = 0
      f.pos.copy(screenToWorld(req.nx, req.ny, camera, JAR.dragZ))
      g.position.copy(f.pos)
      g.visible = true
      g.scale.setScalar(JAR.jarScale)
    }
    if (!f.active) return

    f.pos.lerp(MOUTH, JAR.floatSpeed)
    f.elapsed += delta
    g.position.copy(f.pos)
    g.rotation.y += 0.02

    if (f.pos.distanceTo(MOUTH) < JAR.hitRadius) {
      f.active = false
      g.visible = false
      const count = useFireflyStore.getState().completeGift()
      useMushroomStore.getState().giveFireflies(count)
      return
    }

    if (f.elapsed > JAR.floatTimeout) {
      f.active = false
      g.visible = false
      useFireflyStore.getState().resetGift()
    }
  })

  return (
    <group ref={groupRef} visible={false} scale={JAR.jarScale}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.6, 1.2, 12]} />
        <meshStandardMaterial
          ref={glowRef}
          color="#c8a850"
          emissive="#ffaa00"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.35, 0.5, 0.2, 12]} />
        <meshStandardMaterial color="#a08040" roughness={0.3} />
      </mesh>
      <pointLight ref={lightRef} color="#ffcc44" intensity={0.4} distance={2} />
      {jarCount > 0 && (phase === 'scooping' || phase === 'gifting') && (
        <Html center position={[0, 1.2, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(255, 153, 68, 0.95)',
            color: '#2a1800',
            fontSize: '14px',
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            width: '22px',
            height: '22px',
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {jarCount}
          </div>
        </Html>
      )}
    </group>
  )
}
