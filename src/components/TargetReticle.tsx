import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useFeedingStore } from '../stores/feedingStore'
import { THROW } from '../constants'
import { lerpOpacity } from '../utils/helpers'

const WHITE = new THREE.Color('#ffffff')
const SEGS = 48

export default function TargetReticle() {
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const crossRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ringRef.current || !glowRef.current || !crossRef.current) return
    const active = useFeedingStore.getState().isDragging

    lerpOpacity(ringRef.current.material as THREE.MeshBasicMaterial, active ? 0.5 : 0)
    lerpOpacity(glowRef.current.material as THREE.MeshBasicMaterial, active ? 0.12 : 0)
    crossRef.current.children.forEach((c) =>
      lerpOpacity((c as THREE.Mesh).material as THREE.MeshBasicMaterial, active ? 0.35 : 0),
    )

    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.06
    ringRef.current.scale.setScalar(pulse)
    glowRef.current.scale.setScalar(pulse * 1.15)
  })

  const [x, y, z] = THROW.mouthPos
  const r = THROW.hitRadius
  const mat = <meshBasicMaterial color={WHITE} transparent opacity={0} depthWrite={false} depthTest={false} />

  return (
    <group position={[x, y, z + 0.05]} renderOrder={100}>
      <mesh ref={glowRef}>
        <circleGeometry args={[r * 1.2, SEGS]} />
        {mat}
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[r - 0.025, r, SEGS]} />
        {mat}
      </mesh>
      <group ref={crossRef}>
        <mesh>
          <planeGeometry args={[r * 1.6, 0.02]} />
          {mat}
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[r * 1.6, 0.02]} />
          {mat}
        </mesh>
      </group>
    </group>
  )
}
