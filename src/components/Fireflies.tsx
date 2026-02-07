import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFireflyStore } from '../stores/fireflyStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { FIREFLY } from '../constants'

const { count: COUNT, spawnBounds: B } = FIREFLY

const AMBIENT_COUNT = 10

interface Fly {
  base: THREE.Vector3
  phase: number
  alive: boolean
  opacity: number
  deadTime: number
}

function rng(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function spawnPos() {
  return new THREE.Vector3(rng(B.x[0], B.x[1]), rng(B.y[0], B.y[1]), rng(B.z[0], B.z[1]))
}

// Soft radial gradient texture — bright center fading to transparent edges
function makeGlowTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.15, 'rgba(255,255,255,0.6)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.15)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.04)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

const _projected = new THREE.Vector3()

export default function Fireflies() {
  const groupRef = useRef<THREE.Group>(null)
  const ambientRef = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const evolution = useMushroomStore((s) => s.evolution)

  const pool = useRef<Fly[]>(
    Array.from({ length: COUNT }, () => ({
      base: spawnPos(),
      phase: Math.random() * Math.PI * 2,
      alive: true,
      opacity: 1,
      deadTime: 0,
    })),
  )

  // Ambient fireflies — scattered on the ground, random positions
  const ambientPhases = useRef(
    Array.from({ length: AMBIENT_COUNT }, () => Math.random() * Math.PI * 2),
  )
  const ambientPositions = useMemo(
    () =>
      Array.from({ length: AMBIENT_COUNT }, () =>
        new THREE.Vector3(rng(-4, 4), rng(0.05, 0.25), rng(-3, -1)),
      ),
    [],
  )

  const glowTex = useMemo(() => makeGlowTexture(), [])

  // Soft glow plane
  const glowGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // Diamond-shaped wing geometry — tapers to points at tips
  const wingGeo = useMemo(() => {
    const w = FIREFLY.radius * 4
    const h = FIREFLY.radius * 0.8
    const shape = new THREE.Shape()
    shape.moveTo(-w, 0)
    shape.lineTo(0, h)
    shape.lineTo(w, 0)
    shape.lineTo(0, -h)
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])

  const glowMats = useMemo(
    () =>
      Array.from(
        { length: COUNT },
        () =>
          new THREE.MeshBasicMaterial({
            color: FIREFLY.color.normal,
            map: glowTex,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [glowTex],
  )

  const wingMats = useMemo(
    () =>
      Array.from(
        { length: COUNT },
        () =>
          new THREE.MeshBasicMaterial({
            color: FIREFLY.color.normal,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  )

  // Ambient glow materials — dimmer, no wings
  const ambientMats = useMemo(
    () =>
      Array.from(
        { length: AMBIENT_COUNT },
        () =>
          new THREE.MeshBasicMaterial({
            color: FIREFLY.color.normal,
            map: glowTex,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [glowTex],
  )

  // Glow size — oval: wider than tall
  const GLOW_W = FIREFLY.radius * 6
  const GLOW_H = FIREFLY.radius * 4

  // Ambient glow size — smaller
  const AMB_W = FIREFLY.radius * 3.5
  const AMB_H = FIREFLY.radius * 2.5

  useFrame((state, delta) => {
    const g = groupRef.current
    const ag = ambientRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const store = useFireflyStore.getState()
    const isScooping = store.phase === 'scooping'
    const isDark = evolution === 'dark'
    const colorKey = isDark ? 'dark' : 'normal'

    // --- Catchable fireflies ---
    const flies = pool.current
    for (let i = 0; i < COUNT; i++) {
      const fly = flies[i]
      const flyGroup = g.children[i] as THREE.Group
      if (!flyGroup) continue

      const glowMesh = flyGroup.children[0] as THREE.Mesh
      const wing = flyGroup.children[1] as THREE.Mesh

      if (!fly.alive) {
        fly.opacity = Math.max(0, fly.opacity - delta * FIREFLY.fadeSpeed)
        glowMats[i].opacity = fly.opacity * 0.7
        wingMats[i].opacity = fly.opacity * 0.1
        glowMesh.scale.set(GLOW_W * fly.opacity, GLOW_H * fly.opacity, 1)

        fly.deadTime += delta
        if (fly.deadTime > FIREFLY.respawnDelay) {
          fly.alive = true
          fly.base.copy(spawnPos())
          fly.phase = Math.random() * Math.PI * 2
          fly.opacity = 0
          fly.deadTime = 0
        }
        continue
      }

      if (fly.opacity < 1) {
        fly.opacity = Math.min(1, fly.opacity + delta * 2)
        glowMats[i].opacity = fly.opacity * 0.7
        wingMats[i].opacity = fly.opacity * 0.1
        const s = 0.5 + fly.opacity * 0.5
        glowMesh.scale.set(GLOW_W * s, GLOW_H * s, 1)
      } else {
        const sin = Math.sin(t * FIREFLY.pulseSpeed + fly.phase * 2)
        const pulse = 1 + sin * FIREFLY.pulseAmount
        glowMats[i].opacity = 0.5 + sin * 0.2
        wingMats[i].opacity = 0.08 + sin * 0.04
        glowMesh.scale.set(GLOW_W * pulse, GLOW_H * pulse, 1)
      }

      glowMats[i].color.set(FIREFLY.color[colorKey])
      wingMats[i].color.set(FIREFLY.color[colorKey])

      // Billboard — always face camera
      flyGroup.quaternion.copy(camera.quaternion)

      // Subtle wing flutter
      const flutter = 1 + Math.sin(t * 8 + fly.phase * 3) * 0.15
      if (wing) wing.scale.set(1, flutter, 1)

      const bobY = Math.sin(t * FIREFLY.bobSpeed + fly.phase) * FIREFLY.bobAmount
      const driftX = Math.cos(t * FIREFLY.driftSpeed + fly.phase * 1.5) * FIREFLY.driftRadius
      const driftZ = Math.sin(t * FIREFLY.driftSpeed + fly.phase * 0.7) * FIREFLY.driftRadius

      flyGroup.position.set(fly.base.x + driftX, fly.base.y + bobY, fly.base.z + driftZ)

      if (isScooping) {
        _projected.copy(flyGroup.position).project(camera)
        const sx = (_projected.x * 0.5 + 0.5) * size.width
        const sy = (-_projected.y * 0.5 + 0.5) * size.height
        const dx = sx - store.dragX
        const dy = sy - store.dragY
        if (dx * dx + dy * dy < FIREFLY.catchScreenRadius * FIREFLY.catchScreenRadius) {
          fly.alive = false
          fly.deadTime = 0
          store.addCatch()
        }
      }
    }

    // --- Ambient ground fireflies ---
    if (!ag) return
    const phases = ambientPhases.current
    const positions = ambientPositions
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const mesh = ag.children[i] as THREE.Mesh
      if (!mesh) continue
      const p = phases[i]
      const pos = positions[i]

      // Slow fade in/out cycle — each one blinks at its own rhythm
      const blink = Math.sin(t * 0.5 + p * 4) * 0.5 + 0.5 // 0–1
      ambientMats[i].opacity = blink * 0.3
      ambientMats[i].color.set(FIREFLY.color[colorKey])

      const scale = blink * 0.8 + 0.2
      mesh.scale.set(AMB_W * scale, AMB_H * scale, 1)

      // Billboard
      mesh.quaternion.copy(camera.quaternion)

      // Very gentle bob
      const bobY = Math.sin(t * 0.6 + p) * 0.04
      const driftX = Math.cos(t * 0.15 + p * 1.5) * 0.15
      mesh.position.set(pos.x + driftX, pos.y + bobY, pos.z)
    }
  })

  return (
    <>
      <group ref={groupRef}>
        {Array.from({ length: COUNT }, (_, i) => (
          <group key={i}>
            <mesh geometry={glowGeo} material={glowMats[i]} />
            <mesh geometry={wingGeo} material={wingMats[i]} />
          </group>
        ))}
      </group>
      <group ref={ambientRef}>
        {Array.from({ length: AMBIENT_COUNT }, (_, i) => (
          <mesh key={i} geometry={glowGeo} material={ambientMats[i]} />
        ))}
      </group>
    </>
  )
}
