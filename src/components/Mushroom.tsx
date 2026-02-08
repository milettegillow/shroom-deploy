import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMushroomStore } from '../stores/mushroomStore'
import { useFireflyStore } from '../stores/fireflyStore'
import { LERP, BEHAVIOR, POKE } from '../constants'
import { pickRandom } from '../utils/helpers'
import { POKE_MESSAGES } from '../ai/messages'
import { Mushroom as M } from '../config'

const COLOR_KEYS = Object.keys(M.colors.normal) as (keyof typeof M.colors.normal)[]

function buildSpots(count: number, coverage: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const up = new THREE.Vector3(0, 1, 0)
  return Array.from({ length: count }, (_, i) => {
    const theta = Math.acos(1 - (i + 0.5) / count * coverage)
    const phi = (i * golden) % (Math.PI * 2)
    const normal = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi))
    const pos = normal.clone().multiplyScalar(M.capRadius)
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, normal))
    return { position: [pos.x, pos.y, pos.z] as [number, number, number], rotation: [euler.x, euler.y, euler.z] as [number, number, number], size: M.spotSizes[i % M.spotSizes.length] }
  })
}

const SPOTS = buildSpots(M.spotCount, M.spotCoverage)

export default function Mushroom() {
  const groupRef = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const browLeftRef = useRef<THREE.Mesh>(null)
  const browRightRef = useRef<THREE.Mesh>(null)
  const capMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const stemMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const spotsMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const eyeLeftMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const eyeRightMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const currentColors = useRef(
    Object.fromEntries(COLOR_KEYS.map((k) => [k, M.colors.normal[k].clone()])) as Record<keyof typeof M.colors.normal, THREE.Color>,
  )

  const feedBounce = useRef(0)
  const mouthOpen = useRef(0)
  const lastFeedRef = useRef(0)

  const mistShimmy = useRef(0)
  const lastMistRef = useRef(0)

  const pokeJolt = useRef(0)
  const lastPokeRef = useRef(0)
  const pokeTimestamps = useRef<number[]>([])

  const giftGlow = useRef(0)
  const lastGiftRef = useRef(0)

  const handlePoke = useCallback(() => {
    // If scooping with fireflies, deliver gift instead of poking
    const fireflyState = useFireflyStore.getState()
    if (fireflyState.phase === 'scooping' && fireflyState.jarCount > 0) {
      const count = fireflyState.deliverGift()
      useMushroomStore.getState().giveFireflies(count)
      return
    }

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
    const { evolution, hunger, boredom, lastFeedTime, lastMistTime, lastPokeTime, lastGiftTime } = useMushroomStore.getState()
    const isDark = evolution === 'dark'
    const mode = isDark ? 'dark' : 'normal'

    // Feed detection
    if (lastFeedTime > 0 && lastFeedTime !== lastFeedRef.current) {
      lastFeedRef.current = lastFeedTime
      feedBounce.current = 1
      mouthOpen.current = 0.4
      useMushroomStore.getState().reactToEvent('fed')
    }
    if (mouthOpen.current > 0) mouthOpen.current -= delta

    // Mist detection
    if (lastMistTime > 0 && lastMistTime !== lastMistRef.current) {
      lastMistRef.current = lastMistTime
      mistShimmy.current = 1
      useMushroomStore.getState().reactToEvent('misted')
    }

    // Poke detection
    if (lastPokeTime > 0 && lastPokeTime !== lastPokeRef.current) {
      lastPokeRef.current = lastPokeTime
      pokeJolt.current = 1
    }

    // Gift detection
    if (lastGiftTime > 0 && lastGiftTime !== lastGiftRef.current) {
      lastGiftRef.current = lastGiftTime
      giftGlow.current = 1
      feedBounce.current = 0.8
      useMushroomStore.getState().reactToEvent('gifted')
    }

    // Decay animations
    const anim = hunger >= BEHAVIOR.hungerThreshold ? M.anim.hungry : M.anim.happy
    feedBounce.current *= M.decay.feedBounce
    mistShimmy.current *= M.decay.mistShimmy
    pokeJolt.current *= M.decay.pokeJolt
    giftGlow.current *= M.decay.giftGlow

    // Position: base bounce + feed bounce + poke jolt + mist shiver
    groupRef.current.position.y = anim.baseY + Math.sin(t * anim.bounceSpeed) * anim.bounceAmt + feedBounce.current * Math.sin(t * 8) * 0.15 + mistShimmy.current * Math.sin(t * 18) * 0.04
    groupRef.current.position.x = pokeJolt.current * Math.sin(t * 20) * 0.05 + mistShimmy.current * Math.sin(t * 22) * 0.03

    // Rotation: sway + talk wobble + mist shimmy
    const swayAnim = boredom >= BEHAVIOR.boredomThreshold ? M.anim.hungry : M.anim.happy
    groupRef.current.rotation.z =
      Math.sin(t * swayAnim.swaySpeed) * swayAnim.swayAmt +
      mistShimmy.current * Math.sin(t * 15) * 0.2

    // Squash/stretch + poke squish
    const squash = 1 + Math.sin(t * anim.bounceSpeed) * 0.02
    const pokeSquish = 1 - pokeJolt.current * 0.08
    groupRef.current.scale.set(1 / squash / pokeSquish, squash * pokeSquish, 1 / squash / pokeSquish)

    // Color transitions
    const targetColors = M.colors[mode]
    const targetEmissive = M.emissive[mode]
    for (const key of COLOR_KEYS) currentColors.current[key].lerp(targetColors[key], LERP)

    if (capMatRef.current) {
      capMatRef.current.color.copy(currentColors.current.cap)
      capMatRef.current.emissiveIntensity = giftGlow.current * 0.5
    }
    stemMatRef.current?.color.copy(currentColors.current.stem)
    if (spotsMatRef.current) {
      spotsMatRef.current.color.copy(currentColors.current.spots)
      spotsMatRef.current.emissive.lerp(targetEmissive.spots, LERP)
    }
    for (const ref of [eyeLeftMatRef, eyeRightMatRef]) {
      if (!ref.current) continue
      ref.current.color.copy(currentColors.current.eyes)
      ref.current.emissive.lerp(targetEmissive.eyes, LERP)
    }

    // Mouth
    if (mouthRef.current) {
      const eating = mouthOpen.current > 0
      const targetY = eating ? 2.5 : M.face.mouth[mode]
      mouthRef.current.scale.y += (targetY - mouthRef.current.scale.y) * (eating ? 0.2 : LERP)
    }

    // Eyebrows
    const browTarget = M.face.brow[mode]
    if (browLeftRef.current) browLeftRef.current.rotation.z += (browTarget - browLeftRef.current.rotation.z) * LERP
    if (browRightRef.current) browRightRef.current.rotation.z += (-browTarget - browRightRef.current.rotation.z) * LERP
  })

  return (
    <group ref={groupRef} onPointerDown={handlePoke}>
      {/* Stem */}
      <mesh castShadow>
        <cylinderGeometry args={M.stemArgs} />
        <meshStandardMaterial ref={stemMatRef} color={M.colors.normal.stem} />
      </mesh>

      {/* Cap */}
      <group position={[0, 0.3, 0]} rotation={[M.capTilt, 0, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[M.capRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial ref={capMatRef} color={M.colors.normal.cap} emissive={M.capEmissive} emissiveIntensity={0} />
        </mesh>
        {SPOTS.map((spot, i) => (
          <group key={i} position={spot.position} rotation={spot.rotation}>
            <mesh scale={[1, 0.15, 1]}>
              <sphereGeometry args={[spot.size, 12, 8]} />
              <meshStandardMaterial ref={i === 0 ? spotsMatRef : undefined} color={M.colors.normal.spots} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Eyes */}
      <mesh position={[-M.eyeOffsetX, M.eyeY, M.eyeZ]}>
        <sphereGeometry args={[M.eyeRadius, 8, 8]} />
        <meshStandardMaterial ref={eyeLeftMatRef} color={M.faceColor} />
      </mesh>
      <mesh position={[M.eyeOffsetX, M.eyeY, M.eyeZ]}>
        <sphereGeometry args={[M.eyeRadius, 8, 8]} />
        <meshStandardMaterial ref={eyeRightMatRef} color={M.faceColor} />
      </mesh>

      {/* Eyebrows */}
      <mesh ref={browLeftRef} position={[-M.eyeOffsetX, M.browY, M.eyeZ]} rotation={[0, 0, M.face.brow.normal]}>
        <boxGeometry args={M.browSize} />
        <meshStandardMaterial color={M.faceColor} />
      </mesh>
      <mesh ref={browRightRef} position={[M.eyeOffsetX, M.browY, M.eyeZ]} rotation={[0, 0, -M.face.brow.normal]}>
        <boxGeometry args={M.browSize} />
        <meshStandardMaterial color={M.faceColor} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={M.mouthPos} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={M.mouthArgs} />
        <meshStandardMaterial color={M.faceColor} />
      </mesh>

    </group>
  )
}
