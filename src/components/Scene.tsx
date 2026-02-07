import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Mushroom from './Mushroom'
import FoodProjectile from './FoodProjectile'
import TargetReticle from './TargetReticle'
import Forest from './Forest'
import { useGameLoop } from '../hooks/useGameLoop'
import { useMushroomStore } from '../stores/mushroomStore'

const LERP = 0.04

const LIGHTS = {
  ambient:     { normal: { intensity: 0.7 },                                    dark: { intensity: 0.6 } },
  directional: { normal: { intensity: 1.6, color: new THREE.Color('#c8d8ff') }, dark: { intensity: 1.2, color: new THREE.Color('#80b0b8') } },
  accent:      { normal: { intensity: 0.5, color: new THREE.Color('#7b68ee') }, dark: { intensity: 1.5, color: new THREE.Color('#40a898') } },
  fill:        { normal: { intensity: 0.9, color: new THREE.Color('#ffe8c0') }, dark: { intensity: 0.8, color: new THREE.Color('#5090a0') } },
  rim:         { normal: { intensity: 0.7, color: new THREE.Color('#a0d8ff') }, dark: { intensity: 1.0, color: new THREE.Color('#60c8b0') } },
} as const

type LightName = keyof typeof LIGHTS

function lerpLight(light: THREE.Light, target: { intensity: number; color?: THREE.Color }) {
  light.intensity += (target.intensity - light.intensity) * LERP
  if ('color' in target && target.color) light.color.lerp(target.color, LERP)
}

export default function Scene() {
  useGameLoop()

  const refs = useRef<Record<LightName, THREE.Light | null>>({
    ambient: null, directional: null, accent: null, fill: null, rim: null,
  })
  const evolution = useMushroomStore((s) => s.evolution)

  useFrame(() => {
    const mode = evolution === 'dark' ? 'dark' : 'normal'
    for (const name of Object.keys(LIGHTS) as LightName[]) {
      const light = refs.current[name]
      if (light) lerpLight(light, LIGHTS[name][mode])
    }
  })

  const setRef = (name: LightName) => (el: THREE.Light | null) => { refs.current[name] = el }

  return (
    <>
      <ambientLight ref={setRef('ambient')} intensity={0.4} />
      <directionalLight ref={setRef('directional')} position={[5, 8, 3]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight ref={setRef('accent')} position={[-3, 2, -2]} intensity={0.3} color="#7b68ee" />
      <pointLight ref={setRef('fill')} position={[3, 3, 2]} intensity={0.6} color="#ffe8c0" distance={12} />
      <pointLight ref={setRef('rim')} position={[-2, 4, 4]} intensity={0.5} color="#a0d8ff" distance={10} />

      <Mushroom />
      <TargetReticle />
      <FoodProjectile />
      <Forest />
    </>
  )
}
