import { useCallback, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Clone } from "@react-three/drei";
import * as THREE from "three";
import { useFeedingStore } from "../stores/feedingStore";
import { useMushroomStore } from "../stores/mushroomStore";
import { useGameStore } from "../stores/gameStore";
import { FOOD_TYPES, STAGES } from "../constants";
import classNames from "classnames";
import { useDragListeners } from "../hooks/useDragListeners";
import type { AgeStage, FoodType } from "../types";
import styles from "./FoodTray.module.css";

const GLB_FOODS: Record<
  string,
  {
    path: string;
    scale: number;
    rotation: [number, number, number];
    position: [number, number, number];
  }
> = {
  barkChip: {
    path: "/bark.glb",
    scale: 0.05,
    rotation: [0.4, 0.3, 0],
    position: [0, 0, 0] as [number, number, number],
  },
  deadLeaf: {
    path: "/leaf.glb",
    scale: 15.0,
    rotation: [0.4, 0.3, 0],
    position: [0, -0.8, 0] as [number, number, number],
  },
  rottenLog: {
    path: "/log.glb",
    scale: 5.0,
    rotation: [0.4, 0.3, 0],
    position: [0, -0.3, 0] as [number, number, number],
  },
};

function GlbFoodModel({
  path,
  scale,
  rotation,
  position,
}: {
  path: string;
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
}) {
  const gltf = useGLTF(path);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.2) * 0.15;
    ref.current.rotation.x =
      rotation[0] + Math.sin(clock.elapsedTime * 0.8) * 0.1;
  });

  return (
    <group ref={ref} scale={scale} rotation={rotation} position={position}>
      <Clone object={gltf.scene} />
    </group>
  );
}

function GlbFoodIcon({
  config,
}: {
  config: {
    path: string;
    scale: number;
    rotation: [number, number, number];
    position: [number, number, number];
  };
}) {
  return (
    <Canvas
      style={{ width: 56, height: 56, pointerEvents: "none" }}
      camera={{ position: [0, 0, 5], fov: 30 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <Suspense fallback={null}>
        <GlbFoodModel {...config} />
      </Suspense>
    </Canvas>
  );
}

export default function FoodTray() {
  const { isDragging, dragFoodType, cooldowns } = useFeedingStore();
  const hunger = useMushroomStore((s) => s.hunger);
  const stage = useMushroomStore((s) => s.stage);
  const paused = useGameStore((s) => s.paused);
  const fullness = 100 - Math.round(hunger);
  const availableFoods = STAGES[stage].food;
  const prevFoods = stage > 1 ? STAGES[(stage - 1) as AgeStage].food : [];

  const onPointerDown = useCallback((type: FoodType, e: React.PointerEvent) => {
    e.preventDefault();
    useFeedingStore.getState().startDrag(type, e.clientX, e.clientY);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) =>
      useFeedingStore.getState().updateDrag(e.clientX, e.clientY),
    [],
  );
  const onPointerUp = useCallback(
    () => useFeedingStore.getState().endDrag(),
    [],
  );

  useDragListeners(isDragging, onPointerMove, onPointerUp);

  return (
    <>
      {availableFoods.map((type, i) => {
        const onCooldown = !!cooldowns[type];
        const itemDisabled = onCooldown;
        const isNew = stage > 1 && paused && !prevFoods.includes(type);
        return (
          <div
            key={type}
            data-tutorial={
              i === 0 ? "food-tray" : isNew ? "new-food" : undefined
            }
            className={classNames(
              type in GLB_FOODS ? styles.foodItemGlb : styles.foodItem,
              fullness <= 70 && styles.wobbling,
              itemDisabled && styles.disabled,
              isDragging && dragFoodType === type && styles.loaded,
            )}
            onPointerDown={(e) => onPointerDown(type, e)}
          >
            {isNew && <span className={styles.newBadge}>NEW</span>}
            {onCooldown && (
              <span className={styles.cooldownIcon}>&#x23F3;</span>
            )}
            {type in GLB_FOODS ? (
              <GlbFoodIcon config={GLB_FOODS[type]} />
            ) : (
              <span className={styles.emoji}>{FOOD_TYPES[type].emoji}</span>
            )}
            <span className={styles.label}>{FOOD_TYPES[type].label}</span>
            <span className={styles.tooltip}>
              +{FOOD_TYPES[type].hungerRelief} hunger
            </span>
          </div>
        );
      })}
    </>
  );
}
