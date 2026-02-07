import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Mushroom from './Mushroom'
import FoodProjectile from './FoodProjectile'
import TargetReticle from './TargetReticle'
import JarProjectile from './JarProjectile'
import GiftIndicator from './GiftIndicator'
import Fireflies from './Fireflies'
import Forest from './Forest'
import { useGameLoop } from '../hooks/useGameLoop'
import { useMushroomStore } from '../stores/mushroomStore'
import { LERP } from '../constants'
import { Lighting } from '../config'

type LightName = keyof typeof Lighting.colors

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
    for (const name of Object.keys(Lighting.colors) as LightName[]) {
      const light = refs.current[name]
      if (light) lerpLight(light, Lighting.colors[name][mode])
    }
  })

  const setRef = (name: LightName) => (el: THREE.Light | null) => { refs.current[name] = el }

  return (
    <>
      <ambientLight ref={setRef('ambient')} intensity={0.4} />
      <directionalLight ref={setRef('directional')} position={Lighting.positions.directional} intensity={1.2} castShadow shadow-mapSize={Lighting.shadowMapSize} />
      <pointLight ref={setRef('accent')} position={Lighting.positions.accent} intensity={0.3} color={Lighting.colors.accent.normal.color} />
      <pointLight ref={setRef('fill')} position={Lighting.positions.fill} intensity={0.6} color={Lighting.colors.fill.normal.color} distance={12} />
      <pointLight ref={setRef('rim')} position={Lighting.positions.rim} intensity={0.5} color={Lighting.colors.rim.normal.color} distance={10} />

      <Mushroom />
      <TargetReticle />
      <FoodProjectile />
      <JarProjectile />
      <GiftIndicator />
      <Fireflies />
      <Forest />
    </>
  )
}
