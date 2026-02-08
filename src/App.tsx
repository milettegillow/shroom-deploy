import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import Scene from "./components/Scene";
import { useMultiplayer } from "./hooks/useMultiplayer";
import HUD from "./ui/HUD";

// Kick off all GLB downloads immediately so they load during the title screen
useGLTF.preload("/Mushroom-cute.glb");
useGLTF.preload("/Mushroom-evil.glb");
useGLTF.preload("/bark.glb");
useGLTF.preload("/leaf.glb");
useGLTF.preload("/log.glb");
useGLTF.preload("/splash.glb");
useGLTF.preload("/jar.glb");

export default function App() {
  const { ready } = useMultiplayer();

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0a1a",
          color: "#7a6f9a",
          fontFamily: "monospace",
          fontSize: "1.2rem",
        }}
      >
        Connecting...
      </div>
    );
  }

  return (
    <>
      <Canvas shadows camera={{ position: [0, 1.5, 5], fov: 45 }}>
        <Scene />
      </Canvas>
      <HUD />
    </>
  );
}
