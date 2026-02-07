import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useMushroomStore } from '../stores/mushroomStore'
import { BEHAVIOR, POKE } from '../constants'
import { POKE_MESSAGES } from '../ai/messages'

const COLORS = {
  normal: { cap: new THREE.Color('#c0392b'), stem: new THREE.Color('#e8d5b7'), spots: new THREE.Color('#ffffff'), eyes: new THREE.Color('#2c3e50') },
  dark:   { cap: new THREE.Color('#7a5890'), stem: new THREE.Color('#c0b8b8'), spots: new THREE.Color('#d8c8e0'), eyes: new THREE.Color('#ff3030') },
}

const EMISSIVE = {
  normal: { spots: new THREE.Color('#000000'), eyes: new THREE.Color('#000000') },
  dark:   { spots: new THREE.Color('#c060ff'), eyes: new THREE.Color('#ff2222') },
}

const COLOR_KEYS = Object.keys(COLORS.normal) as (keyof typeof COLORS.normal)[]
const FACE_COLOR = '#2c3e50'
const CAP_RADIUS = 0.55
const CAP_TILT = -0.25
const LERP = 0.04
const SPOT_SIZES = [0.07, 0.04, 0.05, 0.07, 0.035, 0.06, 0.04, 0.07, 0.05, 0.035, 0.06]

const FACE = {
  mouth: { normal: 1, dark: -1 },
  brow:  { normal: 0.3, dark: -0.4 },
} as const

const ANIM = {
  happy:  { bounceSpeed: 2, bounceAmt: 0.05, baseY: 0, swaySpeed: 1.5, swayAmt: 0.03 },
  hungry: { bounceSpeed: 1.2, bounceAmt: 0.02, baseY: -0.05, swaySpeed: 0.8, swayAmt: 0.01 },
} as const

function buildSpots(count: number, coverage: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const up = new THREE.Vector3(0, 1, 0)
  return Array.from({ length: count }, (_, i) => {
    const theta = Math.acos(1 - (i + 0.5) / count * coverage)
    const phi = (i * golden) % (Math.PI * 2)
    const normal = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi))
    const pos = normal.clone().multiplyScalar(CAP_RADIUS)
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, normal))
    return { position: [pos.x, pos.y, pos.z] as [number, number, number], rotation: [euler.x, euler.y, euler.z] as [number, number, number], size: SPOT_SIZES[i % SPOT_SIZES.length] }
  })
}

const SPOTS = buildSpots(22, 0.65)

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function Mushroom() {
  const groupRef = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const browLeftRef = useRef<THREE.Mesh>(null)
  const browRightRef = useRef<THREE.Mesh>(null)
  const matRefs = {
    cap: useRef<THREE.MeshStandardMaterial>(null),
    stem: useRef<THREE.MeshStandardMaterial>(null),
    spots: useRef<THREE.MeshStandardMaterial>(null),
    eyes: [useRef<THREE.MeshStandardMaterial>(null), useRef<THREE.MeshStandardMaterial>(null)],
  }
  const currentColors = useRef(
    Object.fromEntries(COLOR_KEYS.map((k) => [k, COLORS.normal[k].clone()])) as Record<keyof typeof COLORS.normal, THREE.Color>,
  )

  const feedBounce = useRef(0)
  const talkWobble = useRef(0)
  const mouthOpen = useRef(0)
  const lastFeedRef = useRef(0)

  const mistShimmy = useRef(0)
  const lastMistRef = useRef(0)

  const pokeJolt = useRef(0)
  const lastPokeRef = useRef(0)
  const pokeTimestamps = useRef<number[]>([])

  const handlePoke = useCallback(() => {
    const now = Date.now()
    const store = useMushroomStore.getState()

    if (now - lastPokeRef.current < POKE.cooldownMs) return
    store.poke()

    const cutoff = now - POKE.annoyanceWindow
    pokeTimestamps.current = pokeTimestamps.current.filter((t) => t > cutoff)
    pokeTimestamps.current.push(now)

    const annoyed = pokeTimestamps.current.length >= POKE.annoyanceThreshold
    const msg = annoyed ? pickRandom(POKE_MESSAGES.annoyed) : pickRandom(POKE_MESSAGES.normal)
    store.receiveMessage(msg)
  }, [])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    const { evolution, hunger, boredom, lastFeedTime, lastMistTime, lastPokeTime } = useMushroomStore.getState()
    const isDark = evolution === 'dark'
    const mode = isDark ? 'dark' : 'normal'

    // Feed detection
    if (lastFeedTime > 0 && lastFeedTime !== lastFeedRef.current) {
      lastFeedRef.current = lastFeedTime
      feedBounce.current = 1
      mouthOpen.current = 0.4
    }
    if (mouthOpen.current > 0) mouthOpen.current -= delta

    // Mist detection
    if (lastMistTime > 0 && lastMistTime !== lastMistRef.current) {
      lastMistRef.current = lastMistTime
      mistShimmy.current = 1
    }

    // Poke detection
    if (lastPokeTime > 0 && lastPokeTime !== lastPokeRef.current) {
      lastPokeRef.current = lastPokeTime
      pokeJolt.current = 1
    }

    // Decay animations
    const anim = hunger >= BEHAVIOR.hungerThreshold ? ANIM.hungry : ANIM.happy
    feedBounce.current *= 0.95
    talkWobble.current *= 0.93
    mistShimmy.current *= 0.92
    pokeJolt.current *= 0.88

    // Position: base bounce + feed bounce + poke jolt
    groupRef.current.position.y = anim.baseY + Math.sin(t * anim.bounceSpeed) * anim.bounceAmt + feedBounce.current * Math.sin(t * 8) * 0.15
    groupRef.current.position.x = pokeJolt.current * Math.sin(t * 20) * 0.05

    // Rotation: sway + talk wobble + mist shimmy
    const swayAnim = boredom >= BEHAVIOR.boredomThreshold ? ANIM.hungry : ANIM.happy
    groupRef.current.rotation.z =
      Math.sin(t * swayAnim.swaySpeed) * swayAnim.swayAmt +
      talkWobble.current * Math.sin(t * 12) * 0.08 +
      mistShimmy.current * Math.sin(t * 15) * 0.1

    // Squash/stretch + poke squish
    const squash = 1 + Math.sin(t * anim.bounceSpeed) * 0.02
    const pokeSquish = 1 - pokeJolt.current * 0.08
    groupRef.current.scale.set(1 / squash / pokeSquish, squash * pokeSquish, 1 / squash / pokeSquish)

    // Color transitions
    const targetColors = COLORS[mode]
    const targetEmissive = EMISSIVE[mode]
    for (const key of COLOR_KEYS) currentColors.current[key].lerp(targetColors[key], LERP)

    matRefs.cap.current?.color.copy(currentColors.current.cap)
    matRefs.stem.current?.color.copy(currentColors.current.stem)
    if (matRefs.spots.current) {
      matRefs.spots.current.color.copy(currentColors.current.spots)
      matRefs.spots.current.emissive.lerp(targetEmissive.spots, LERP)
    }
    for (const ref of matRefs.eyes) {
      if (!ref.current) continue
      ref.current.color.copy(currentColors.current.eyes)
      ref.current.emissive.lerp(targetEmissive.eyes, LERP)
    }

    // Mouth
    if (mouthRef.current) {
      const eating = mouthOpen.current > 0
      const targetY = eating ? 2.5 : FACE.mouth[mode]
      mouthRef.current.scale.y += (targetY - mouthRef.current.scale.y) * (eating ? 0.2 : LERP)
    }

    // Eyebrows
    const browTarget = FACE.brow[mode]
    if (browLeftRef.current) browLeftRef.current.rotation.z += (browTarget - browLeftRef.current.rotation.z) * LERP
    if (browRightRef.current) browRightRef.current.rotation.z += (-browTarget - browRightRef.current.rotation.z) * LERP
  })

  return (
    <group ref={groupRef} onPointerDown={handlePoke}>
      {/* Stem */}
      <mesh castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.8, 16]} />
        <meshStandardMaterial ref={matRefs.stem} color="#e8d5b7" />
      </mesh>

      {/* Cap */}
      <group position={[0, 0.3, 0]} rotation={[CAP_TILT, 0, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[CAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial ref={matRefs.cap} color="#c0392b" />
        </mesh>
        {SPOTS.map((spot, i) => (
          <group key={i} position={spot.position} rotation={spot.rotation}>
            <mesh scale={[1, 0.15, 1]}>
              <sphereGeometry args={[spot.size, 12, 8]} />
              <meshStandardMaterial ref={i === 0 ? matRefs.spots : undefined} color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Eyes */}
      {([-0.12, 0.12] as const).map((x, i) => (
        <mesh key={x} position={[x, 0.25, 0.26]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial ref={matRefs.eyes[i]} color={FACE_COLOR} />
        </mesh>
      ))}

      {/* Eyebrows */}
      <mesh ref={browLeftRef} position={[-0.12, 0.34, 0.26]} rotation={[0, 0, FACE.brow.normal]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color={FACE_COLOR} />
      </mesh>
      <mesh ref={browRightRef} position={[0.12, 0.34, 0.26]} rotation={[0, 0, -FACE.brow.normal]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color={FACE_COLOR} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, 0.12, 0.28]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color={FACE_COLOR} />
      </mesh>

      {/* Mist water particles */}
      {mistShimmy.current > 0.1 && (
        <Sparkles
          count={20}
          size={3}
          scale={[1, 1.5, 1]}
          position={[0, 0.8, 0]}
          speed={2}
          color="#88ccff"
          opacity={0.7}
        />
      )}
    </group>
  )
}
