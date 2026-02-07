import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Clouds, Cloud } from '@react-three/drei'
import * as THREE from 'three'
import { useMushroomStore } from '../stores/mushroomStore'
import type { EvolutionState } from '../types'

const LERP = 0.04

const DECO_MUSHROOMS: { position: [number, number, number]; scale: number }[] = [
  { position: [-2.5, -0.35, -1.5], scale: 0.8 },
  { position: [3, -0.35, -2], scale: 0.6 },
  { position: [-1.8, -0.35, -2.5], scale: 1.0 },
  { position: [2, -0.35, -1], scale: 0.5 },
  { position: [-3.5, -0.35, -0.5], scale: 0.7 },
]

const GLOW_PLANTS: { position: [number, number, number]; scale: number }[] = [
  { position: [-1.5, -0.5, -1], scale: 1.0 },
  { position: [1.8, -0.5, -1.8], scale: 1.0 },
  { position: [-0.5, -0.5, -2.2], scale: 1.0 },
  { position: [2.8, -0.5, -0.8], scale: 1.0 },
  { position: [-3.0, -0.5, -2.0], scale: 1.3 },
  { position: [0.8, -0.5, -0.5], scale: 0.6 },
  { position: [-2.2, -0.5, 0.2], scale: 0.8 },
  { position: [3.5, -0.5, -2.5], scale: 1.1 },
  { position: [0.2, -0.5, -3.0], scale: 0.7 },
  { position: [-1.5, -0.5, -3.8], scale: 0.4 },
  { position: [2.5, -0.5, -3.5], scale: 0.35 },
  { position: [-1.0, -0.5, -4.5], scale: 0.3 },
  { position: [1.5, -0.5, -4.5], scale: 0.25 },
  { position: [-3.5, -0.5, -4.2], scale: 0.3 },
  { position: [0.5, -0.5, -5.2], scale: 0.2 },
  { position: [5.0, -0.5, -6.0], scale: 0.25 },
  { position: [-4.8, -0.5, -5.5], scale: 0.2 },
  { position: [-0.5, -0.5, -6.5], scale: 0.2 },
  { position: [4.0, -0.5, -7.0], scale: 0.15 },
  { position: [-2.0, -0.5, -7.5], scale: 0.15 },
  { position: [3.0, -0.5, -7.5], scale: 0.15 },
]

const TREES: { position: [number, number, number]; scale: number; seed: number }[] = [
  { position: [-4.5, -0.5, -3.0], scale: 1.2, seed: 0 },
  { position: [5.0, -0.5, -3.5], scale: 1.0, seed: 1 },
  { position: [-2.5, -0.5, -5.0], scale: 0.8, seed: 2 },
  { position: [3.5, -0.5, -5.5], scale: 0.7, seed: 3 },
  { position: [-6.0, -0.5, -4.5], scale: 0.9, seed: 4 },
  { position: [1.5, -0.5, -6.5], scale: 0.6, seed: 5 },
  { position: [-4.0, -0.5, -7.0], scale: 0.5, seed: 6 },
  { position: [6.5, -0.5, -5.0], scale: 0.65, seed: 7 },
]

const DECO_COLORS = {
  normal: { stem: new THREE.Color('#d4c5a9'), cap: new THREE.Color('#8b5e3c') },
  dark:   { stem: new THREE.Color('#a0a898'), cap: new THREE.Color('#506058') },
}

const PLANT_COLORS = {
  normal: { stem: new THREE.Color('#4a8b3f'), bulb: new THREE.Color('#7bff6b') },
  dark:   { stem: new THREE.Color('#2a5848'), bulb: new THREE.Color('#40eebb') },
}

const TREE_COLORS = {
  normal: { trunk: new THREE.Color('#5a3a1a'), canopy: new THREE.Color('#2d6b1e') },
  dark:   { trunk: new THREE.Color('#3a2818'), canopy: new THREE.Color('#1a3a18') },
}

const SKY_COLORS = {
  normal: { top: new THREE.Color('#101830'), mid: new THREE.Color('#1e3058'), bot: new THREE.Color('#2a3850') },
  dark:   { top: new THREE.Color('#081018'), mid: new THREE.Color('#122030'), bot: new THREE.Color('#1a3040') },
}

const FOG_DENSITY   = { normal: 0.02, dark: 0.04 }
const GROUND_COLORS = { normal: new THREE.Color('#2d5a27'), dark: new THREE.Color('#1a3028') }
const SPARKLE_COLOR = { normal: '#ffeb3b', dark: '#40eebb' }
const SMOKE_COLOR   = { normal: '#558855', dark: '#2a4838' }
const SMOKE_OPACITY = { normal: 0.15, dark: 0.25 }

const MOON_OPACITY = { normal: 0.9, dark: 0.3 }
const MOON_LIGHT_INTENSITY = { normal: 1.0, dark: 0.1 }
const MOON_COLOR = new THREE.Color('#e8e4d8')
const MOON_POSITION: [number, number, number] = [4, 5, -6]

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
  { position: [0, 5, -6],    speed: 0.15, opacity: { normal: 0.35, dark: 0.35 }, segments: 15, bounds: [10, 2, 3],   volume: 5,   color: { normal: '#7090b8', dark: '#506878' } },
  { position: [-5, 4, -5],   speed: 0.1,  opacity: { normal: 0.3,  dark: 0.3 },  segments: 12, bounds: [8, 1.5, 2],  volume: 4,   color: { normal: '#8098b0', dark: '#485868' }, seed: 42 },
  { position: [4, 4.5, -7],  speed: 0.12, opacity: { normal: 0.28, dark: 0.3 },  segments: 10, bounds: [8, 1.5, 2],  volume: 4,   color: { normal: '#7890a8', dark: '#506070' }, seed: 99 },
  { position: [-2, 6, -8],   speed: 0.08, opacity: { normal: 0.25, dark: 0.25 }, segments: 14, bounds: [12, 2, 3],   volume: 5,   color: { normal: '#6888a8', dark: '#485060' }, seed: 15 },
  { position: [6, 5.5, -9],  speed: 0.1,  opacity: { normal: 0.22, dark: 0.25 }, segments: 10, bounds: [8, 1.5, 2],  volume: 3.5, color: { normal: '#7898b0', dark: '#4a5868' }, seed: 33 },
  { position: [-7, 5, -8],   speed: 0.07, opacity: { normal: 0.2,  dark: 0.2 },  segments: 8,  bounds: [6, 1, 2],    volume: 3,   color: { normal: '#6080a0', dark: '#405060' }, seed: 77 },
  { position: [2, 6.5, -10], speed: 0.06, opacity: { normal: 0.18, dark: 0.2 },  segments: 8,  bounds: [10, 1.5, 3], volume: 4,   color: { normal: '#7088a0', dark: '#485868' }, seed: 55 },
]

const FOG_CLOUDS: CloudConfig[] = [
  { position: [0, -0.2, -1],  speed: 0.05, opacity: { normal: 0, dark: 0.4 },  segments: 20, bounds: [14, 0.8, 10], volume: 2.5, color: { normal: '#406040', dark: '#506860' }, seed: 7 },
  { position: [-3, 0, -3],    speed: 0.03, opacity: { normal: 0, dark: 0.35 }, segments: 15, bounds: [8, 0.6, 6],   volume: 2,   color: { normal: '#406040', dark: '#485858' }, seed: 23 },
  { position: [3, -0.1, -2],  speed: 0.04, opacity: { normal: 0, dark: 0.3 },  segments: 12, bounds: [6, 0.5, 5],   volume: 2,   color: { normal: '#406040', dark: '#506050' }, seed: 51 },
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

function DecoMushroom({ position, scale, evolution }: {
  position: [number, number, number]; scale: number; evolution: EvolutionState
}) {
  const stemRef = useRef<THREE.MeshStandardMaterial>(null)
  const capRef = useRef<THREE.MeshStandardMaterial>(null)
  const mode = evolution === 'dark' ? 'dark' : 'normal'

  useFrame(() => {
    stemRef.current?.color.lerp(DECO_COLORS[mode].stem, LERP)
    capRef.current?.color.lerp(DECO_COLORS[mode].cap, LERP)
  })

  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
        <meshStandardMaterial ref={stemRef} color="#d4c5a9" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={capRef} color="#8b5e3c" />
      </mesh>
    </group>
  )
}

const GLOW_LIGHT_THRESHOLD = 0.5

function GlowPlant({ position, scale = 1, evolution }: {
  position: [number, number, number]; scale?: number; evolution: EvolutionState
}) {
  const hasLight = scale >= GLOW_LIGHT_THRESHOLD
  const lightRef = useRef<THREE.PointLight>(null)
  const stemRef = useRef<THREE.MeshStandardMaterial>(null)
  const bulbRef = useRef<THREE.MeshStandardMaterial>(null)
  const target = evolution === 'dark' ? PLANT_COLORS.dark : PLANT_COLORS.normal

  useFrame((state) => {
    stemRef.current?.color.lerp(target.stem, LERP)
    if (bulbRef.current) {
      bulbRef.current.color.lerp(target.bulb, LERP)
      bulbRef.current.emissive.lerp(target.bulb, LERP)
    }
    if (lightRef.current) {
      lightRef.current.color.lerp(target.bulb, LERP)
      lightRef.current.intensity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15
    }
  })

  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.02, 0.03, 0.5, 6]} />
        <meshStandardMaterial ref={stemRef} color="#4a8b3f" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial ref={bulbRef} color="#7bff6b" emissive="#7bff6b" emissiveIntensity={hasLight ? 0.5 : 0.8} />
      </mesh>
      {hasLight && <pointLight ref={lightRef} position={[0, 0.3, 0]} color="#7bff6b" intensity={0.3} distance={2} />}
    </group>
  )
}

function Tree({ position, scale, seed, evolution }: {
  position: [number, number, number]; scale: number; seed: number; evolution: EvolutionState
}) {
  const trunkRef = useRef<THREE.MeshStandardMaterial>(null)
  const canopyRef = useRef<THREE.MeshStandardMaterial>(null)
  const canopyTopRef = useRef<THREE.MeshStandardMaterial>(null)
  const target = evolution === 'dark' ? TREE_COLORS.dark : TREE_COLORS.normal
  const trunkHeight = 1.2 + (seed % 3) * 0.3
  const canopyRadius = 0.8 + (seed % 4) * 0.15
  const canopyY = trunkHeight * 0.5 + canopyRadius * 0.4

  useFrame(() => {
    trunkRef.current?.color.lerp(target.trunk, LERP)
    canopyRef.current?.color.lerp(target.canopy, LERP)
    canopyTopRef.current?.color.lerp(target.canopy, LERP)
  })

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, trunkHeight, 8]} />
        <meshStandardMaterial ref={trunkRef} color="#5a3a1a" />
      </mesh>
      <mesh position={[0, canopyY, 0]}>
        <coneGeometry args={[canopyRadius, canopyRadius * 2, 8]} />
        <meshStandardMaterial ref={canopyRef} color="#2d6b1e" />
      </mesh>
      <mesh position={[0, canopyY + canopyRadius * 0.9, 0]}>
        <coneGeometry args={[canopyRadius * 0.7, canopyRadius * 1.5, 8]} />
        <meshStandardMaterial ref={canopyTopRef} color="#2d6b1e" />
      </mesh>
    </group>
  )
}

function Moon({ evolution }: { evolution: EvolutionState }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const mode = evolution === 'dark' ? 'dark' : 'normal'

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity += (MOON_OPACITY[mode] - matRef.current.opacity) * LERP
    }
    if (lightRef.current) {
      lightRef.current.intensity += (MOON_LIGHT_INTENSITY[mode] - lightRef.current.intensity) * LERP
    }
  })

  return (
    <group position={MOON_POSITION}>
      <mesh renderOrder={999}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          ref={matRef}
          color={MOON_COLOR}
          transparent
          opacity={0.9}
          depthTest={false}
          fog={false}
        />
      </mesh>
      <pointLight ref={lightRef} color="#c8c4b8" intensity={0.6} distance={30} />
    </group>
  )
}

export default function Forest() {
  const fogRef = useRef<THREE.FogExp2>(null)
  const groundRef = useRef<THREE.MeshStandardMaterial>(null)
  const evolution = useMushroomStore((s) => s.evolution)

  const skyUniforms = useRef({
    uTopColor: { value: SKY_COLORS.normal.top.clone() },
    uMidColor: { value: SKY_COLORS.normal.mid.clone() },
    uBotColor: { value: SKY_COLORS.normal.bot.clone() },
  })

  const skyMaterial = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: skyUniforms.current,
      side: THREE.BackSide,
      depthWrite: false,
    }),
    [],
  )

  useFrame(() => {
    const mode = evolution === 'dark' ? 'dark' : 'normal'

    if (fogRef.current) fogRef.current.density += (FOG_DENSITY[mode] - fogRef.current.density) * LERP
    groundRef.current?.color.lerp(GROUND_COLORS[mode], LERP)

    skyUniforms.current.uTopColor.value.lerp(SKY_COLORS[mode].top, LERP)
    skyUniforms.current.uMidColor.value.lerp(SKY_COLORS[mode].mid, LERP)
    skyUniforms.current.uBotColor.value.lerp(SKY_COLORS[mode].bot, LERP)
  })

  const isDark = evolution === 'dark'
  const mode = isDark ? 'dark' : 'normal'

  return (
    <group>
      <fogExp2 ref={fogRef} attach="fog" args={['#0a1a0a', 0.02]} />

      <mesh material={skyMaterial}>
        <sphereGeometry args={[50, 32, 16]} />
      </mesh>

      <Moon evolution={evolution} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial ref={groundRef} color="#2d5a27" />
      </mesh>

      <Clouds>
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

      <Sparkles count={80} size={4} scale={[8, 4, 8]} position={[0, 1, 0]} speed={0.4} color={SPARKLE_COLOR[mode]} opacity={0.8} />
      <Sparkles count={40} size={12} scale={[10, 0.8, 10]} position={[0, -0.1, 0]} speed={0.15} color={SMOKE_COLOR[mode]} opacity={SMOKE_OPACITY[mode]} noise={2} />

      {DECO_MUSHROOMS.map((props, i) => (
        <DecoMushroom key={i} {...props} evolution={evolution} />
      ))}
      {GLOW_PLANTS.map((props, i) => (
        <GlowPlant key={i} {...props} evolution={evolution} />
      ))}
      {TREES.map((props, i) => (
        <Tree key={i} {...props} evolution={evolution} />
      ))}
    </group>
  )
}
