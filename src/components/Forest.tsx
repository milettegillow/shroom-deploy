import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Clouds, Cloud } from '@react-three/drei'
import * as THREE from 'three'
import { useMushroomStore } from '../stores/mushroomStore'
import { LERP } from '../constants'
import type { EvolutionState } from '../types'
import { Env } from '../config'

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
    stemRef.current?.color.lerp(Env.decoColors[mode].stem, LERP)
    capRef.current?.color.lerp(Env.decoColors[mode].cap, LERP)
  })

  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
        <meshStandardMaterial ref={stemRef} color={Env.decoColors.normal.stem} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={capRef} color={Env.decoColors.normal.cap} />
      </mesh>
    </group>
  )
}

function GlowPlant({ position, scale = 1, evolution }: {
  position: [number, number, number]; scale?: number; evolution: EvolutionState
}) {
  const hasLight = scale >= Env.glowLightThreshold
  const lightRef = useRef<THREE.PointLight>(null)
  const stemRef = useRef<THREE.MeshStandardMaterial>(null)
  const bulbRef = useRef<THREE.MeshStandardMaterial>(null)
  const target = evolution === 'dark' ? Env.plantColors.dark : Env.plantColors.normal

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
        <meshStandardMaterial ref={stemRef} color={Env.plantColors.normal.stem} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial ref={bulbRef} color={Env.plantColors.normal.bulb} emissive={Env.plantColors.normal.bulb} emissiveIntensity={hasLight ? 0.5 : 0.8} />
      </mesh>
      {hasLight && <pointLight ref={lightRef} position={[0, 0.3, 0]} color={Env.plantColors.normal.bulb} intensity={0.3} distance={2} />}
    </group>
  )
}

function Tree({ position, scale, seed, evolution }: {
  position: [number, number, number]; scale: number; seed: number; evolution: EvolutionState
}) {
  const trunkRef = useRef<THREE.MeshStandardMaterial>(null)
  const canopyRef = useRef<THREE.MeshStandardMaterial>(null)
  const canopyTopRef = useRef<THREE.MeshStandardMaterial>(null)
  const target = evolution === 'dark' ? Env.treeColors.dark : Env.treeColors.normal
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
        <meshStandardMaterial ref={trunkRef} color={Env.treeColors.normal.trunk} />
      </mesh>
      <mesh position={[0, canopyY, 0]}>
        <coneGeometry args={[canopyRadius, canopyRadius * 2, 8]} />
        <meshStandardMaterial ref={canopyRef} color={Env.treeColors.normal.canopy} />
      </mesh>
      <mesh position={[0, canopyY + canopyRadius * 0.9, 0]}>
        <coneGeometry args={[canopyRadius * 0.7, canopyRadius * 1.5, 8]} />
        <meshStandardMaterial ref={canopyTopRef} color={Env.treeColors.normal.canopy} />
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

export default function Forest() {
  const fogRef = useRef<THREE.FogExp2>(null)
  const groundRef = useRef<THREE.MeshStandardMaterial>(null)
  const evolution = useMushroomStore((s) => s.evolution)

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

  useFrame(() => {
    const mode = evolution === 'dark' ? 'dark' : 'normal'

    if (fogRef.current) fogRef.current.density += (Env.fogDensity[mode] - fogRef.current.density) * LERP
    groundRef.current?.color.lerp(Env.groundColors[mode], LERP)

    skyUniforms.uTopColor.value.lerp(Env.skyColors[mode].top, LERP)
    skyUniforms.uMidColor.value.lerp(Env.skyColors[mode].mid, LERP)
    skyUniforms.uBotColor.value.lerp(Env.skyColors[mode].bot, LERP)
  })

  const isDark = evolution === 'dark'
  const mode = isDark ? 'dark' : 'normal'

  return (
    <group>
      <fogExp2 ref={fogRef} attach="fog" args={[Env.fogColor, Env.fogDensity.normal]} />

      <mesh material={skyMaterial}>
        <sphereGeometry args={[Env.skyRadius, 32, 16]} />
      </mesh>

      <Moon evolution={evolution} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[Env.groundRadius, 64]} />
        <meshStandardMaterial ref={groundRef} color={Env.groundColors.normal} />
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

      <Sparkles count={Env.sparkles.count} size={Env.sparkles.size} scale={Env.sparkles.scale} position={[0, -0.1, 0]} speed={Env.sparkles.speed} color={Env.smokeColor[mode]} opacity={Env.smokeOpacity[mode]} noise={Env.sparkles.noise} />

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
