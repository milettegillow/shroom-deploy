import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Clone } from "@react-three/drei";
import * as THREE from "three";
import { useMushroomStore } from "../stores/mushroomStore";
import { useGameStore } from "../stores/gameStore";
import { mushroomWorldPos } from "../stores/mushroomPosition";
import { MIST } from "../constants";
import classNames from "classnames";
import styles from "./MistButton.module.css";

function SplashModel() {
  const gltf = useGLTF("/splash.glb");
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if ('color' in mat) (mat as THREE.MeshStandardMaterial).color.set('#4dc8ff');
        });
      }
    });
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.8;
  });

  return (
    <group
      ref={ref}
      scale={0.013}
      rotation={[0.4, 0.3, 0]}
      position={[-0.3, 2, 1.33]}
    >
      <Clone object={gltf.scene} />
    </group>
  );
}

function SplashIcon() {
  return (
    <Canvas
      style={{ width: 56, height: 56, pointerEvents: "none" }}
      camera={{ position: [0, 0, 5], fov: 30 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <Suspense fallback={null}>
        <SplashModel />
      </Suspense>
    </Canvas>
  );
}

interface MistParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  drift: number;
  solid: boolean;
}

interface HitSplash {
  id: number;
  x: number;
  y: number;
}

// Visual spawn rate (ms) — fast for smooth continuous look
const VISUAL_TICK = 60;
// How many solid drops + mist wisps per tick
const DROPS_PER_TICK = 3;
const WISPS_PER_TICK = 1;

export default function MistButton() {
  const nextIdRef = useRef(0);
  const [active, setActive] = useState(false);
  const [holding, setHolding] = useState(false);
  const cursorRef = useRef({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<MistParticle[]>([]);
  const [splashes, setSplashes] = useState<HitSplash[]>([]);
  const lastMistRef = useRef(0);
  const visualRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thirst = useMushroomStore((s) => s.thirst);
  const gamePhase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused);
  const needsMist = 100 - Math.round(thirst) <= 40;

  // Clear mist mode on game over / restart / pause (tutorial/celebration)
  useEffect(() => {
    if (gamePhase === "gameOver" || paused) {
      setActive(false);
      setHolding(false);
    }
  }, [gamePhase, paused]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const newParticles: MistParticle[] = [
      // Solid water drops — small, opaque, fast
      ...Array.from({ length: DROPS_PER_TICK }, () => ({
        id: nextIdRef.current++,
        x: x + (Math.random() - 0.5) * 80,
        y: y - 5 - Math.random() * 15,
        size: 4 + Math.random() * 5,
        delay: Math.random() * 0.02,
        drift: (Math.random() - 0.5) * 12,
        solid: true,
      })),
      // Mist wisps — larger, softer, slower
      ...Array.from({ length: WISPS_PER_TICK }, () => ({
        id: nextIdRef.current++,
        x: x + (Math.random() - 0.5) * 100,
        y: y - 10 - Math.random() * 25,
        size: 14 + Math.random() * 18,
        delay: Math.random() * 0.04,
        drift: (Math.random() - 0.5) * 20,
        solid: false,
      })),
    ];
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 1000);
  }, []);

  const tryMistStat = useCallback((x: number, y: number) => {
    if (useGameStore.getState().paused) return;
    const now = Date.now();
    if (now - lastMistRef.current < MIST.cooldownMs) return;
    lastMistRef.current = now;

    const shroomX = mushroomWorldPos.screenX || window.innerWidth / 2;
    const shroomY = mushroomWorldPos.screenY || window.innerHeight / 2;
    const dist = Math.hypot(x - shroomX, y - shroomY);
    if (dist < MIST.hitRadius) {
      useMushroomStore.getState().mist();
      const splashId = nextIdRef.current++;
      setSplashes((prev) => [
        ...prev,
        { id: splashId, x: shroomX, y: shroomY },
      ]);
      setTimeout(() => {
        setSplashes((prev) => prev.filter((s) => s.id !== splashId));
      }, 800);
    }
  }, []);

  // Click button to toggle mist mode
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setActive((a) => !a);
    setHolding(false);
  }, []);

  // Escape to exit mist mode
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // Hold in spray zone = continuous shower
  const handleZoneDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    cursorRef.current = { x: e.clientX, y: e.clientY };
    setHolding(true);
  }, []);

  const handleZoneUp = useCallback(() => {
    setHolding(false);
    setActive(false);
  }, []);

  // Rapid visual particle spawning + periodic stat application
  useEffect(() => {
    if (!holding) {
      if (visualRef.current) {
        clearInterval(visualRef.current);
        visualRef.current = null;
      }
      return;
    }
    // Spawn immediately
    spawnParticles(cursorRef.current.x, cursorRef.current.y);
    tryMistStat(cursorRef.current.x, cursorRef.current.y);

    visualRef.current = setInterval(() => {
      const { x, y } = cursorRef.current;
      spawnParticles(x, y);
      tryMistStat(x, y);
    }, VISUAL_TICK);

    return () => {
      if (visualRef.current) {
        clearInterval(visualRef.current);
        visualRef.current = null;
      }
    };
  }, [holding, spawnParticles, tryMistStat]);

  // Global pointerup to stop holding (and deactivate if paused/tutorial)
  useEffect(() => {
    if (!holding) return;
    const onUp = () => {
      setHolding(false);
      if (useGameStore.getState().paused) setActive(false);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [holding]);

  return (
    <>
      <div className={styles.wrapper}>
        <div
          className={classNames(
            styles.buttonGlb,
            active && styles.active,
            needsMist && !active && styles.shake,
          )}
          onClick={handleToggle}
        >
          <SplashIcon />
        </div>
        <span className={styles.label}>Mist</span>
      </div>

      {active &&
        createPortal(
          <div
            className={styles.sprayZone}
            onPointerDown={handleZoneDown}
            onPointerUp={handleZoneUp}
            onPointerMove={(e) => {
              cursorRef.current = { x: e.clientX, y: e.clientY };
              setCursorPos({ x: e.clientX, y: e.clientY });
            }}
          >
            <div
              className={styles.cursor}
              style={{ left: cursorPos.x, top: cursorPos.y }}
            >
              <Canvas
                style={{ width: 80, height: 80, pointerEvents: "none" }}
                camera={{ position: [0, 0, 5], fov: 30 }}
                gl={{ alpha: true, antialias: true }}
              >
                <ambientLight intensity={1.5} />
                <directionalLight position={[2, 2, 2]} intensity={1} />
                <Suspense fallback={null}>
                  <SplashModel />
                </Suspense>
              </Canvas>
            </div>
          </div>,
          document.body,
        )}

      {particles.map((p) => (
        <div
          key={p.id}
          className={p.solid ? styles.waterDrop : styles.mistWisp}
          style={
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.solid ? p.size * 1.4 : p.size,
              animationDelay: `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}

      {splashes.map((s) => (
        <div
          key={s.id}
          className={styles.hitSplash}
          style={{ left: s.x, top: s.y }}
        />
      ))}
    </>
  );
}
