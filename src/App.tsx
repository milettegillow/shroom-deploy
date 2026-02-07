import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import HUD from './ui/HUD'

export default function App() {
  return (
    <>
      <Canvas shadows camera={{ position: [0, 1.5, 5], fov: 45 }}>
        <Scene />
      </Canvas>
      <HUD />
    </>
  )
}
