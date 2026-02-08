import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Clouds, Cloud } from '@react-three/drei'
import * as THREE from 'three'
import { useMushroomStore } from '../stores/mushroomStore'
import { LERP } from '../constants'
import type { EvolutionState } from '../types'
import { Env, Color } from '../config'

// Seeded PRNG (mulberry32) — deterministic textures that survive remounts
function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Ground mounds — very gentle raised terrain banks far from center, creating wide forest path
const GROUND_MOUNDS: { position: [number, number, number]; scale: [number, number, number]; rotation?: number }[] = [
  // --- Left bank (far out, very low/wide) ---
  { position: [-6.0, -0.5, 0.5],  scale: [5.0, 0.25, 5.0] },
  { position: [-6.5, -0.5, -2.5], scale: [5.5, 0.3, 7.0], rotation: 0.06 },
  { position: [-7.0, -0.5, -5.5], scale: [5.0, 0.35, 6.0], rotation: 0.08 },
  { position: [-6.0, -0.5, -7.5], scale: [4.5, 0.25, 5.0] },
  // --- Right bank (far out, very low/wide) ---
  { position: [6.0, -0.5, 0.5],   scale: [5.0, 0.25, 5.0] },
  { position: [6.5, -0.5, -2.5],  scale: [5.5, 0.3, 7.0], rotation: -0.06 },
  { position: [7.0, -0.5, -5.5],  scale: [5.0, 0.35, 6.0], rotation: -0.08 },
  { position: [6.0, -0.5, -7.5],  scale: [4.5, 0.25, 5.0] },
  // --- Back bank (gentle close-off) ---
  { position: [0, -0.5, -8.5],    scale: [10, 0.3, 4.0] },
  { position: [-4.0, -0.5, -9.5], scale: [5, 0.25, 3.5] },
  { position: [4.0, -0.5, -9.5],  scale: [5, 0.25, 3.5] },
]

const DECO_MUSHROOMS: { position: [number, number, number]; scale: number; tall?: number }[] = [
  // --- Center/path level (y=-0.5 is ground) ---
  { position: [-2.5, -0.22, -2.5], scale: 0.5, tall: 0.5 },
  { position: [2.5, -0.22, -1.2],  scale: 0.25, tall: 0.3 },
  { position: [-2.0, -0.22, -0.5], scale: 0.3, tall: 0.6 },
  { position: [1.8, -0.22, -3.0],  scale: 0.22, tall: 0.25 },
  // --- Left bank mushrooms (raised to sit on top of mounds) ---
  { position: [-5.0, -0.05, -0.8],  scale: 0.45, tall: 0.7 },
  { position: [-5.8, 0.0, -1.8],    scale: 0.35, tall: 0.35 },
  { position: [-6.2, 0.05, -3.0],   scale: 0.55, tall: 0.5 },
  { position: [-5.5, 0.0, -4.2],    scale: 0.3, tall: 0.25 },
  { position: [-6.8, 0.05, -3.8],   scale: 0.4, tall: 0.6 },
  { position: [-5.2, -0.05, -5.5],  scale: 0.25, tall: 0.3 },
  { position: [-4.5, -0.1, 0.3],    scale: 0.32, tall: 0.7 },
  // --- Right bank mushrooms (raised to sit on top of mounds) ---
  { position: [5.2, -0.05, -0.5],   scale: 0.42, tall: 0.35 },
  { position: [5.8, 0.0, -1.5],     scale: 0.35, tall: 0.6 },
  { position: [6.5, 0.05, -3.2],    scale: 0.5, tall: 0.25 },
  { position: [5.2, 0.0, -3.8],     scale: 0.28, tall: 0.55 },
  { position: [6.2, 0.05, -4.5],    scale: 0.38, tall: 0.3 },
  { position: [5.8, 0.0, -2.2],     scale: 0.45, tall: 0.7 },
  { position: [4.5, -0.1, 0.2],     scale: 0.3, tall: 0.4 },
  // --- Back mushrooms ---
  { position: [-2.5, -0.15, -6.5],  scale: 0.2, tall: 0.25 },
  { position: [2.5, -0.15, -6.8],   scale: 0.18, tall: 0.6 },
  { position: [0, -0.15, -7.2],     scale: 0.25, tall: 0.35 },
]

const GLOW_PLANTS: { position: [number, number, number]; scale: number }[] = [
  // --- Path level (ground y=-0.5) ---
  { position: [-2.0, -0.35, -1],   scale: 1.0 },
  { position: [2.0, -0.35, -1.8],  scale: 1.0 },
  { position: [-1.0, -0.35, -2.2], scale: 1.0 },
  { position: [2.8, -0.35, -0.8],  scale: 1.0 },
  { position: [0.8, -0.35, -0.5],  scale: 0.6 },
  { position: [0.2, -0.35, -3.0],  scale: 0.7 },
  // --- Left bank (on mounds, raised) ---
  { position: [-5.5, -0.1, -2.0],   scale: 1.3 },
  { position: [-4.5, -0.15, 0.2],   scale: 0.8 },
  { position: [-6.0, -0.05, -1.0],  scale: 0.9 },
  { position: [-6.5, 0.0, -3.5],    scale: 1.0 },
  { position: [-5.8, -0.05, -5.0],  scale: 0.6 },
  { position: [-7.0, 0.0, -2.8],    scale: 0.7 },
  // --- Right bank (on mounds, raised) ---
  { position: [5.8, -0.05, -2.5],   scale: 1.1 },
  { position: [4.5, -0.15, -0.3],   scale: 0.8 },
  { position: [6.2, 0.0, -1.8],     scale: 0.9 },
  { position: [6.0, -0.05, -4.2],   scale: 0.7 },
  { position: [7.0, 0.0, -3.5],     scale: 0.6 },
  // --- Back / distance ---
  { position: [-1.5, -0.3, -3.8],   scale: 0.4 },
  { position: [2.5, -0.3, -3.5],    scale: 0.35 },
  { position: [-1.0, -0.3, -4.5],   scale: 0.3 },
  { position: [1.5, -0.3, -4.5],    scale: 0.25 },
  { position: [0.5, -0.3, -5.2],    scale: 0.2 },
  { position: [-5.5, -0.05, -6.0],  scale: 0.3 },
  { position: [6.0, -0.05, -5.5],   scale: 0.25 },
  { position: [-0.5, -0.3, -6.5],   scale: 0.2 },
  { position: [-3.0, -0.2, -7.5],   scale: 0.15 },
  { position: [3.5, -0.2, -7.5],    scale: 0.15 },
]

const TREES: { position: [number, number, number]; scale: number; seed: number }[] = [
  // --- Front framing trees (close to camera, screen edges) ---
  { position: [-5.5, -0.5, 1.0],  scale: 2.0, seed: 8 },
  { position: [5.5, -0.5, 0.8],   scale: 1.9, seed: 9 },
  { position: [-7.0, -0.5, -0.5], scale: 2.2, seed: 10 },
  { position: [7.0, -0.5, -0.3],  scale: 2.1, seed: 11 },

  // --- Mid-ground tall trees ---
  { position: [-4.5, -0.5, -3.0], scale: 1.5, seed: 0 },
  { position: [5.0, -0.5, -3.5],  scale: 1.4, seed: 1 },
  { position: [-6.0, -0.5, -4.5], scale: 1.3, seed: 4 },
  { position: [6.5, -0.5, -5.0],  scale: 1.1, seed: 7 },
  { position: [-3.0, -0.5, -2.0], scale: 1.6, seed: 12 },
  { position: [3.8, -0.5, -2.2],  scale: 1.5, seed: 13 },

  // --- Mid-ground medium trees ---
  { position: [-2.5, -0.5, -5.0], scale: 0.9, seed: 2 },
  { position: [3.5, -0.5, -5.5],  scale: 0.8, seed: 3 },
  { position: [1.5, -0.5, -6.5],  scale: 0.7, seed: 5 },
  { position: [-5.5, -0.5, -6.0], scale: 1.0, seed: 14 },
  { position: [5.5, -0.5, -6.5],  scale: 0.85, seed: 15 },

  // --- Background trees (far, smaller from perspective) ---
  { position: [-4.0, -0.5, -7.0], scale: 0.6, seed: 6 },
  { position: [2.5, -0.5, -8.0],  scale: 0.55, seed: 16 },
  { position: [-1.5, -0.5, -8.5], scale: 0.5, seed: 17 },
  { position: [4.5, -0.5, -9.0],  scale: 0.45, seed: 18 },
  { position: [-3.5, -0.5, -9.5], scale: 0.4, seed: 19 },
  { position: [0.5, -0.5, -10.0], scale: 0.35, seed: 20 },

  // --- Extra side fill ---
  { position: [-7.5, -0.5, -3.0], scale: 1.7, seed: 21 },
  { position: [8.0, -0.5, -3.5],  scale: 1.6, seed: 22 },
  { position: [-8.5, -0.5, -6.0], scale: 1.0, seed: 23 },
  { position: [8.5, -0.5, -7.0],  scale: 0.9, seed: 24 },
]

type CloudConfig = {
  position: [number, number, number]
  speed: number
  opacity: { normal: number; dark: number }
  segments: number
  bounds: [number, number, number]
  volume: number
  color: { normal: string; dark: string }
  seed?: number
}

const SKY_CLOUDS: CloudConfig[] = [
  { position: [0, 5, -6],    speed: 0.15, opacity: { normal: 0.35, dark: 0.35 }, segments: 8,  bounds: [10, 2, 3],   volume: 5,   color: { normal: Color.CLOUD_SKY_BRIGHT, dark: Color.CLOUD_SKY_DARK } },
  { position: [-5, 4, -5],   speed: 0.1,  opacity: { normal: 0.3,  dark: 0.3 },  segments: 6,  bounds: [8, 1.5, 2],  volume: 4,   color: { normal: Color.CLOUD_SKY_MID,    dark: Color.CLOUD_SKY_DARK_B }, seed: 42 },
  { position: [4, 4.5, -7],  speed: 0.12, opacity: { normal: 0.28, dark: 0.3 },  segments: 6,  bounds: [8, 1.5, 2],  volume: 4,   color: { normal: Color.CLOUD_SKY_BRIGHT, dark: Color.CLOUD_SKY_DARK }, seed: 99 },
  { position: [-2, 6, -8],   speed: 0.08, opacity: { normal: 0.25, dark: 0.25 }, segments: 8,  bounds: [12, 2, 3],   volume: 5,   color: { normal: Color.CLOUD_SKY_DIM,    dark: Color.CLOUD_SKY_DARK_C }, seed: 15 },
  { position: [6, 5.5, -9],  speed: 0.1,  opacity: { normal: 0.22, dark: 0.25 }, segments: 5,  bounds: [8, 1.5, 2],  volume: 3.5, color: { normal: Color.CLOUD_SKY_MID,    dark: Color.CLOUD_SKY_DARK }, seed: 33 },
  { position: [-7, 5, -8],   speed: 0.07, opacity: { normal: 0.2,  dark: 0.2 },  segments: 5,  bounds: [6, 1, 2],    volume: 3,   color: { normal: Color.CLOUD_SKY_DIM,    dark: Color.CLOUD_SKY_DARK_C }, seed: 77 },
  { position: [2, 6.5, -10], speed: 0.06, opacity: { normal: 0.18, dark: 0.2 },  segments: 5,  bounds: [10, 1.5, 3], volume: 4,   color: { normal: Color.CLOUD_SKY_MID,    dark: Color.CLOUD_SKY_DARK_B }, seed: 55 },
]

const FOG_CLOUDS: CloudConfig[] = [
  // Main ground mist — wide center
  { position: [0, -0.1, -1],  speed: 0.12, opacity: { normal: 0.35, dark: 0.5 },  segments: 12, bounds: [16, 1.2, 12], volume: 3.2, color: { normal: Color.CLOUD_FOG_NORMAL,   dark: Color.CLOUD_FOG_DARK }, seed: 7 },
  // Left bank mist
  { position: [-3, 0.1, -3],  speed: 0.08, opacity: { normal: 0.3,  dark: 0.45 }, segments: 10, bounds: [10, 1.0, 8],  volume: 2.8, color: { normal: Color.CLOUD_FOG_NORMAL_B, dark: Color.CLOUD_FOG_DARK_B }, seed: 23 },
  // Right bank mist
  { position: [4, 0, -1.5],   speed: 0.10, opacity: { normal: 0.32, dark: 0.45 }, segments: 8,  bounds: [10, 1.0, 8],  volume: 2.8, color: { normal: Color.CLOUD_FOG_NORMAL,   dark: Color.CLOUD_FOG_DARK }, seed: 51 },
  // Right mid-ground haze
  { position: [5, 0.2, -4],   speed: 0.07, opacity: { normal: 0.28, dark: 0.4 },  segments: 6,  bounds: [8, 0.8, 6],   volume: 2.4, color: { normal: Color.CLOUD_FOG_NORMAL_B, dark: Color.CLOUD_FOG_DARK_B }, seed: 41 },
  // Center-back depth haze
  { position: [0, 0.2, -5],   speed: 0.06, opacity: { normal: 0.25, dark: 0.4 },  segments: 10, bounds: [14, 0.8, 8],  volume: 2.4, color: { normal: Color.CLOUD_FOG_NORMAL_B, dark: Color.CLOUD_FOG_DARK_B }, seed: 63 },
  // Foreground wisps — right side
  { position: [2, 0.3, 1],    speed: 0.14, opacity: { normal: 0.2,  dark: 0.35 }, segments: 6,  bounds: [8, 0.6, 4],   volume: 2.0, color: { normal: Color.CLOUD_FOG_NORMAL,   dark: Color.CLOUD_FOG_DARK }, seed: 88 },
]

const ALL_CLOUDS = [...SKY_CLOUDS, ...FOG_CLOUDS]

const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uBotColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    vec3 color;
    if (h > 0.0) {
      color = mix(uMidColor, uTopColor, h);
    } else {
      color = mix(uMidColor, uBotColor, -h);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`

function DecoMushroom({ position, scale, tall = 1, evolution }: {
  position: [number, number, number]; scale: number; tall?: number; evolution: EvolutionState
}) {
  const stemRef = useRef<THREE.MeshStandardMaterial>(null)
  const capRef = useRef<THREE.MeshStandardMaterial>(null)
  const mode = evolution === 'dark' ? 'dark' : 'normal'
  const stemH = 0.3 * tall
  const capY = stemH / 2 - 0.02

  useFrame(() => {
    stemRef.current?.color.lerp(Env.decoColors[mode].stem, LERP)
    if (capRef.current) {
      capRef.current.color.lerp(Env.decoColors[mode].cap, LERP)
      capRef.current.emissive.lerp(Env.decoEmissive[mode], LERP)
    }
  })

  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.064, 0.08, stemH, 8]} />
        <meshStandardMaterial ref={stemRef} color={Env.decoColors.normal.stem} />
      </mesh>
      <mesh position={[0, capY, 0]}>
        <sphereGeometry args={[0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={capRef} color={Env.decoColors.normal.cap} emissive={Env.decoEmissive.normal} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function GlowPlant({ position, scale = 1, evolution }: {
  position: [number, number, number]; scale?: number; evolution: EvolutionState
}) {
  const hasLight = scale >= Env.glowLightThreshold
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const stemRef = useRef<THREE.MeshStandardMaterial>(null)
  const bulbRef = useRef<THREE.MeshStandardMaterial>(null)
  const target = evolution === 'dark' ? Env.plantColors.dark : Env.plantColors.normal
  // Per-plant randomized sway params derived from position
  const rng = useMemo(() => mulberry32(Math.floor((position[0] + 50) * 100 + (position[2] + 50) * 7)), [position])
  const sway = useMemo(() => ({
    speedZ: 0.8 + rng() * 0.8,
    speedX: 0.5 + rng() * 0.6,
    ampZ: 0.08 + rng() * 0.1,
    ampX: 0.04 + rng() * 0.06,
    phase: rng() * Math.PI * 2,
    phaseX: rng() * Math.PI * 2,
  }), [rng])

  useFrame((state) => {
    stemRef.current?.color.lerp(target.stem, LERP)
    if (bulbRef.current) {
      bulbRef.current.color.lerp(target.bulb, LERP)
      bulbRef.current.emissive.lerp(target.bulb, LERP)
    }
    if (lightRef.current) {
      lightRef.current.color.lerp(target.bulb, LERP)
      lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.25
    }
    if (groupRef.current) {
      const t = state.clock.elapsedTime
      groupRef.current.rotation.z = Math.sin(t * sway.speedZ + sway.phase) * sway.ampZ
      groupRef.current.rotation.x = Math.sin(t * sway.speedX + sway.phaseX) * sway.ampX
    }
  })

  return (
    <group position={position} scale={scale} ref={groupRef}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.012, 0.2, 6]} />
        <meshStandardMaterial ref={stemRef} color={Env.plantColors.normal.stem} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial ref={bulbRef} color={Env.plantColors.normal.bulb} emissive={Env.plantColors.normal.bulb} emissiveIntensity={hasLight ? 0.8 : 1.0} />
      </mesh>
      {hasLight && <pointLight ref={lightRef} position={[0, 0.13, 0]} color={Env.plantColors.normal.bulb} intensity={0.5} distance={2} />}
    </group>
  )
}

function GroundMound({ position, scale, rotation = 0, evolution, texture }: {
  position: [number, number, number]; scale: [number, number, number]; rotation?: number; evolution: EvolutionState; texture: THREE.CanvasTexture
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const mode = evolution === 'dark' ? 'dark' : 'normal'

  useFrame(() => {
    matRef.current?.color.lerp(Env.bankColors[mode], LERP)
  })

  return (
    <mesh position={position} scale={scale} rotation={[0, rotation, 0]}>
      <sphereGeometry args={[1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial ref={matRef} color={Env.bankColors.normal} map={texture} roughness={0.95} />
    </mesh>
  )
}

function Tree({ position, scale, seed, evolution, barkMap, canopyMap }: {
  position: [number, number, number]; scale: number; seed: number; evolution: EvolutionState; barkMap: THREE.CanvasTexture; canopyMap: THREE.CanvasTexture
}) {
  const trunkRef = useRef<THREE.MeshStandardMaterial>(null)
  const canopyRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const mode = evolution === 'dark' ? 'dark' : 'normal'
  const targetColor = Env.treeColors[mode]
  const targetEmissive = Env.treeEmissive[mode]

  // Seed-based variation — tall trunks for magical ancient forest feel
  const heightTier = [2.5, 3.2, 4.0, 3.6, 2.8, 3.4, 2.2, 4.5, 3.0, 3.8, 2.6, 4.2, 3.5, 2.4, 3.1, 4.0, 2.9, 3.7, 2.3, 3.3, 4.3, 2.7, 3.9, 2.5, 3.6]
  const trunkHeight = heightTier[seed % heightTier.length]
  const spread = 0.8 + (seed % 4) * 0.15
  const lean = ((seed % 7) - 3) * 0.03
  const canopyY = trunkHeight * 0.82

  // Overlapping spheres for rounded oak/elm canopy
  const canopyBlobs = useMemo(() => [
    { pos: [0, canopyY, 0] as const, scl: [spread * 1.4, spread * 0.8, spread * 1.3] as const },
    { pos: [spread * 0.35, canopyY + spread * 0.2, spread * 0.15] as const, scl: [spread * 0.95, spread * 0.6, spread * 0.85] as const },
    { pos: [-spread * 0.3, canopyY + spread * 0.35, -spread * 0.12] as const, scl: [spread * 0.85, spread * 0.55, spread * 0.75] as const },
  ], [canopyY, spread])

  useFrame(() => {
    if (trunkRef.current) {
      trunkRef.current.color.lerp(targetColor.trunk, LERP)
      trunkRef.current.emissive.lerp(targetEmissive.trunk, LERP)
      trunkRef.current.emissiveIntensity += (Env.trunkEmissiveIntensity[mode] - trunkRef.current.emissiveIntensity) * LERP
    }
    for (const mat of canopyRefs.current) {
      if (mat) {
        mat.color.lerp(targetColor.canopy, LERP)
        mat.emissive.lerp(targetEmissive.canopy, LERP)
        mat.emissiveIntensity += (Env.canopyEmissiveIntensity[mode] - mat.emissiveIntensity) * LERP
      }
    }
  })

  return (
    <group position={position} scale={scale} rotation={[0, 0, lean]}>
      {/* Trunk — capped at canopy center so it never pokes out */}
      <mesh position={[0, canopyY / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.35, canopyY, 8]} />
        <meshStandardMaterial ref={trunkRef} color={Env.treeColors.normal.trunk} emissive={Env.treeEmissive.normal.trunk} emissiveIntensity={Env.trunkEmissiveIntensity.normal} map={barkMap} roughness={0.9} />
      </mesh>
      {/* Canopy — overlapping spheres for spreading oak/elm shape */}
      {canopyBlobs.map((blob, i) => (
        <mesh key={i} position={blob.pos} scale={blob.scl}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial
            ref={el => { canopyRefs.current[i] = el }}
            color={Env.treeColors.normal.canopy}
            emissive={Env.treeEmissive.normal.canopy}
            emissiveIntensity={Env.canopyEmissiveIntensity.normal}
            map={canopyMap}
            roughness={0.85}
          />
        </mesh>
      ))}
    </group>
  )
}

function Moon({ evolution }: { evolution: EvolutionState }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const mode = evolution === 'dark' ? 'dark' : 'normal'

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity += (Env.moonOpacity[mode] - matRef.current.opacity) * LERP
    }
    if (lightRef.current) {
      lightRef.current.intensity += (Env.moonLightIntensity[mode] - lightRef.current.intensity) * LERP
    }
  })

  return (
    <group position={Env.moonPosition}>
      <mesh renderOrder={999}>
        <sphereGeometry args={[Env.moonRadius, 16, 16]} />
        <meshBasicMaterial
          ref={matRef}
          color={Env.moonColor}
          transparent
          opacity={0.9}
          depthTest={false}
          fog={false}
        />
      </mesh>
      <pointLight ref={lightRef} color={Env.moonLightColor} intensity={0.6} distance={30} />
    </group>
  )
}

// Soft gradient texture for god rays — bright center fading to transparent edges
function createRayTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size * 4
  const ctx = canvas.getContext('2d')!

  // Vertical gradient: transparent top → bright center → transparent bottom
  const grad = ctx.createLinearGradient(0, 0, 0, size * 4)
  grad.addColorStop(0, 'rgba(160, 200, 240, 0)')
  grad.addColorStop(0.15, 'rgba(160, 200, 240, 0.12)')
  grad.addColorStop(0.4, 'rgba(180, 220, 255, 0.25)')
  grad.addColorStop(0.6, 'rgba(180, 220, 255, 0.25)')
  grad.addColorStop(0.85, 'rgba(160, 200, 240, 0.12)')
  grad.addColorStop(1, 'rgba(160, 200, 240, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size * 4)

  // Horizontal fade: transparent edges → opaque center
  const imgData = ctx.getImageData(0, 0, size, size * 4)
  const d = imgData.data
  const halfW = size / 2
  for (let y = 0; y < size * 4; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dist = Math.abs(x - halfW) / halfW
      const fade = Math.max(0, 1 - dist * dist)
      d[idx + 3] = Math.floor(d[idx + 3] * fade)
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function GodRays({ evolution }: { evolution: EvolutionState }) {
  const matsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const mode = evolution === 'dark' ? 'dark' : 'normal'
  const rayTexture = useMemo(() => createRayTexture(), [])

  useFrame((state) => {
    const targetAlpha = mode === 'normal' ? 1 : 0
    matsRef.current.forEach((mat, i) => {
      if (!mat) return
      const base = targetAlpha * (0.7 + (i % 3) * 0.15)
      const shimmer = Math.sin(state.clock.elapsedTime * 0.25 + i * 2.1) * 0.15
      mat.opacity += (base + shimmer - mat.opacity) * LERP
    })
  })

  const rays = useMemo(() => [
    { pos: [0.5, 4, -5] as const, rot: [0.08, 0, 0.06] as const, w: 2.0, h: 12 },
    { pos: [-2, 4, -6] as const, rot: [0.06, 0, -0.1] as const, w: 2.5, h: 14 },
    { pos: [3, 4, -7] as const, rot: [0.04, 0, 0.14] as const, w: 1.8, h: 11 },
    { pos: [-0.8, 4, -4] as const, rot: [0.1, 0, -0.03] as const, w: 1.5, h: 10 },
    { pos: [2, 4, -8] as const, rot: [0.03, 0, 0.05] as const, w: 2.2, h: 13 },
  ], [])

  return (
    <group>
      {rays.map((r, i) => (
        <mesh
          key={i}
          position={r.pos}
          rotation={r.rot}
          renderOrder={-1}
        >
          <planeGeometry args={[r.w, r.h]} />
          <meshBasicMaterial
            ref={(el) => { if (el) matsRef.current[i] = el }}
            map={rayTexture}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function createMossTexture(size: number, tileCount: number, seed = 100): THREE.CanvasTexture {
  const rng = mulberry32(seed * 4999 + 13)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#506850'
  ctx.fillRect(0, 0, size, size)

  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 40
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.6))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.7))
  }
  ctx.putImageData(imageData, 0, 0)

  for (let i = 0; i < 60; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = rng() * 12 + 3
    const bright = rng()
    ctx.fillStyle = `rgba(${20 + Math.floor(bright * 40)}, ${60 + Math.floor(bright * 50)}, ${30 + Math.floor(bright * 35)}, ${0.1 + rng() * 0.12})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(tileCount, tileCount)
  return texture
}

function createBarkTexture(size: number, seed: number): THREE.CanvasTexture {
  const rng = mulberry32(seed * 7919 + 31)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Seed-varied base tint — warm vs cool bark
  const baseTint = Math.floor(rng() * 3)
  const bases = ['#988ca0', '#a09098', '#8c90a8']
  ctx.fillStyle = bases[baseTint]
  ctx.fillRect(0, 0, size, size)

  // Bark grain — seed varies count and width
  const grainCount = 10 + Math.floor(rng() * 12)
  for (let i = 0; i < grainCount; i++) {
    const x = rng() * size
    const w = 0.5 + rng() * 3
    ctx.fillStyle = `rgba(60, 50, 70, ${0.1 + rng() * 0.2})`
    ctx.fillRect(x, 0, w, size)
  }

  // Pixel noise
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 40
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.5))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.5))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.6))
  }
  ctx.putImageData(imageData, 0, 0)

  // Seed-driven vein style — dramatically different per tree
  const veinCount = 2 + Math.floor(rng() * 7)          // 2-8 veins (wide range)
  const veinHue = Math.floor(rng() * 4)                  // 0=cyan, 1=teal, 2=blue-white, 3=purple-cyan
  const hueColors = [
    { glow: [80, 200, 240], core: [120, 230, 255] },     // cyan
    { glow: [60, 220, 180], core: [100, 245, 210] },     // teal
    { glow: [140, 180, 240], core: [180, 220, 255] },    // blue-white
    { glow: [120, 160, 240], core: [160, 190, 255] },    // purple-cyan
  ]
  const hue = hueColors[veinHue]
  const ampBase = 4 + rng() * 20                          // tight (4) vs wide wavy (24)
  const freqBase = 0.015 + rng() * 0.04                   // slow vs fast oscillation
  const glowWidth = 6 + rng() * 12                        // thin glow vs wide glow

  for (let i = 0; i < veinCount; i++) {
    const startX = rng() * size
    const amp = ampBase * (0.6 + rng() * 0.8)
    const freq = freqBase * (0.7 + rng() * 0.6)
    const phase = rng() * Math.PI * 2

    // Outer glow halo
    const glowAlpha = 0.08 + rng() * 0.08
    ctx.strokeStyle = `rgba(${hue.glow[0]}, ${hue.glow[1]}, ${hue.glow[2]}, ${glowAlpha})`
    ctx.lineWidth = glowWidth * (0.6 + rng() * 0.8)
    ctx.beginPath()
    for (let y = 0; y < size; y += 2) {
      const x = startX + Math.sin(y * freq + phase) * amp
      y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Bright core
    const coreAlpha = 0.25 + rng() * 0.2
    ctx.strokeStyle = `rgba(${hue.core[0]}, ${hue.core[1]}, ${hue.core[2]}, ${coreAlpha})`
    ctx.lineWidth = 1 + rng() * 2.5
    ctx.beginPath()
    for (let y = 0; y < size; y += 2) {
      const x = startX + Math.sin(y * freq + phase) * amp
      y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Branching veins — count varies by seed
  const branchCount = 1 + Math.floor(rng() * 6)
  for (let i = 0; i < branchCount; i++) {
    const sx = rng() * size
    const sy = rng() * size
    const len = 15 + rng() * 50
    const angle = -Math.PI / 2 + (rng() - 0.5) * 1.2
    ctx.strokeStyle = `rgba(${hue.core[0]}, ${hue.core[1]}, ${hue.core[2]}, ${0.1 + rng() * 0.12})`
    ctx.lineWidth = 0.5 + rng() * 1.5
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 3)
  return texture
}

function createCanopyTexture(size: number, seed: number): THREE.CanvasTexture {
  const rng = mulberry32(seed * 6263 + 47)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Bright base — material color will darken via multiplication
  ctx.fillStyle = '#d0c8e8'
  ctx.fillRect(0, 0, size, size)

  // Leaf clusters — bright so they survive color multiplication
  for (let i = 0; i < 80; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 4 + rng() * 16
    const type = rng()
    let color: string
    if (type < 0.35) {
      const v = rng()
      color = `rgba(${150 + Math.floor(v * 60)}, ${170 + Math.floor(v * 50)}, ${220 + Math.floor(v * 35)}, ${0.12 + rng() * 0.15})`
    } else if (type < 0.6) {
      const v = rng()
      color = `rgba(${170 + Math.floor(v * 50)}, ${150 + Math.floor(v * 40)}, ${210 + Math.floor(v * 40)}, ${0.1 + rng() * 0.12})`
    } else if (type < 0.8) {
      const v = rng()
      color = `rgba(${130 + Math.floor(v * 40)}, ${200 + Math.floor(v * 40)}, ${220 + Math.floor(v * 30)}, ${0.1 + rng() * 0.12})`
    } else {
      const v = rng()
      color = `rgba(${200 + Math.floor(v * 40)}, ${160 + Math.floor(v * 40)}, ${210 + Math.floor(v * 40)}, ${0.08 + rng() * 0.1})`
    }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Pixel noise
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 35
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.5))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.5))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.7))
  }
  ctx.putImageData(imageData, 0, 0)

  // Leaf shapes
  for (let i = 0; i < 35; i++) {
    const x = rng() * size
    const y = rng() * size
    const len = 6 + rng() * 14
    const wid = 2 + rng() * 5
    const angle = rng() * Math.PI
    const type = rng()
    let r2: number, g: number, b: number
    if (type < 0.4) {
      r2 = 160 + Math.floor(rng() * 60); g = 180 + Math.floor(rng() * 50); b = 230 + Math.floor(rng() * 25)
    } else if (type < 0.7) {
      r2 = 140 + Math.floor(rng() * 50); g = 200 + Math.floor(rng() * 40); b = 230 + Math.floor(rng() * 25)
    } else {
      r2 = 190 + Math.floor(rng() * 50); g = 170 + Math.floor(rng() * 40); b = 220 + Math.floor(rng() * 35)
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = `rgba(${r2}, ${g}, ${b}, ${0.15 + rng() * 0.12})`
    ctx.beginPath()
    ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Dark shadow patches
  for (let i = 0; i < 25; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 5 + rng() * 12
    ctx.fillStyle = `rgba(40, 30, 80, ${0.08 + rng() * 0.1})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Bright highlights
  for (let i = 0; i < 15; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 3 + rng() * 8
    ctx.fillStyle = `rgba(230, 225, 255, ${0.08 + rng() * 0.1})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

export default function Forest() {
  const fogRef = useRef<THREE.FogExp2>(null)
  const groundRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightningRef = useRef<THREE.PointLight>(null)
  const nextFlash = useRef(3 + Math.random() * 5)
  const flashTimer = useRef(0)
  const evolution = useMushroomStore((s) => s.evolution)

  const groundTexture = useMemo(() => createMossTexture(256, 4, 100), [])
  const bankTexture = useMemo(() => createMossTexture(128, 3, 200), [])
  // One unique texture per tree seed — deterministic (seeded PRNG) so remounts produce identical results
  const treeSeeds = useMemo(() => [...new Set(TREES.map(t => t.seed))], [])
  const barkTextures = useMemo(() => {
    const map = new Map<number, THREE.CanvasTexture>()
    for (const s of treeSeeds) map.set(s, createBarkTexture(128, s))
    return map
  }, [treeSeeds])
  const canopyTextures = useMemo(() => {
    const map = new Map<number, THREE.CanvasTexture>()
    for (const s of treeSeeds) map.set(s, createCanopyTexture(128, s))
    return map
  }, [treeSeeds])

  const fogColorTargets = useMemo(() => ({
    normal: new THREE.Color(Env.fogColor.normal),
    dark: new THREE.Color(Env.fogColor.dark),
  }), [])

  const skyUniforms = useMemo(() => ({
    uTopColor: { value: Env.skyColors.normal.top.clone() },
    uMidColor: { value: Env.skyColors.normal.mid.clone() },
    uBotColor: { value: Env.skyColors.normal.bot.clone() },
  }), [])

  const skyMaterial = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    }),
    [skyUniforms],
  )

  useFrame((_, delta) => {
    const isDarkMode = evolution === 'dark'
    const mode = isDarkMode ? 'dark' : 'normal'

    if (fogRef.current) {
      fogRef.current.density += (Env.fogDensity[mode] - fogRef.current.density) * LERP
      fogRef.current.color.lerp(fogColorTargets[mode], LERP)
    }
    groundRef.current?.color.lerp(Env.groundColors[mode], LERP)

    skyUniforms.uTopColor.value.lerp(Env.skyColors[mode].top, LERP)
    skyUniforms.uMidColor.value.lerp(Env.skyColors[mode].mid, LERP)
    skyUniforms.uBotColor.value.lerp(Env.skyColors[mode].bot, LERP)

    // Lightning flashes in dark mode
    if (lightningRef.current) {
      if (isDarkMode) {
        flashTimer.current += delta
        if (flashTimer.current >= nextFlash.current) {
          // Trigger a flash — bright burst that fades fast
          lightningRef.current.intensity = 4 + Math.random() * 3
          flashTimer.current = 0
          nextFlash.current = 4 + Math.random() * 8
        }
        // Rapid decay
        lightningRef.current.intensity *= 0.88
      } else {
        // Lerp to 0 when not dark
        lightningRef.current.intensity *= 0.92
        flashTimer.current = 0
      }
    }
  })

  const isDark = evolution === 'dark'
  const mode = isDark ? 'dark' : 'normal'

  return (
    <group>
      <fogExp2 ref={fogRef} attach="fog" args={[Env.fogColor.normal, Env.fogDensity.normal]} />

      <mesh material={skyMaterial}>
        <sphereGeometry args={[Env.skyRadius, 32, 16]} />
      </mesh>

      <Moon evolution={evolution} />
      <GodRays evolution={evolution} />
      {/* Lightning flash light */}
      <pointLight ref={lightningRef} position={[0, 10, -4]} color="#c8d8ff" intensity={0} distance={60} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[Env.groundRadius, 32]} />
        <meshStandardMaterial ref={groundRef} color={Env.groundColors.normal} map={groundTexture} roughness={0.95} />
      </mesh>

      <Clouds texture="/cloud.png">
        {ALL_CLOUDS.map((c, i) => (
          <Cloud
            key={i}
            position={c.position}
            speed={c.speed}
            opacity={c.opacity[mode]}
            segments={c.segments}
            bounds={c.bounds}
            volume={c.volume}
            color={c.color[mode]}
            seed={c.seed}
          />
        ))}
      </Clouds>

      <Sparkles count={Env.sparkles.count} size={Env.sparkles.size} scale={Env.sparkles.scale} position={[0, -0.1, 0]} speed={Env.sparkles.speed} color={Env.smokeColor[mode]} opacity={Env.smokeOpacity[mode]} noise={Env.sparkles.noise} />

      {GROUND_MOUNDS.map((props, i) => (
        <GroundMound key={i} {...props} evolution={evolution} texture={bankTexture} />
      ))}
      {DECO_MUSHROOMS.map((props, i) => (
        <DecoMushroom key={i} {...props} evolution={evolution} />
      ))}
      {GLOW_PLANTS.map((props, i) => (
        <GlowPlant key={i} {...props} evolution={evolution} />
      ))}
      {TREES.map((props, i) => (
        <Tree key={i} {...props} evolution={evolution} barkMap={barkTextures.get(props.seed)!} canopyMap={canopyTextures.get(props.seed)!} />
      ))}
    </group>
  )
}
