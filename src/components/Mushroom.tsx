import { useRef, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useMushroomStore } from "../stores/mushroomStore";
import { useFireflyStore } from "../stores/fireflyStore";
import { mushroomWorldPos } from "../stores/mushroomPosition";
import { BEHAVIOR, POKE } from "../constants";
import { pickRandom } from "../utils/helpers";
import { POKE_MESSAGES } from "../ai/messages";

const IDLE_ANIMATIONS = [
  "Bounce_Right",
  "Bounce_Left",
  "Hop",
  "Idle_Wobble",
  "Restless_Hop",
];

const ANIMATION_OFFSETS: Record<string, number> = {
  Bounce_Right: 0.35,
  Bounce_Left: -0.35,
  Hop: 0,
  Idle_Wobble: 0,
  Restless_Hop: 0,
};

const ANIM = {
  happy: {
    bounceSpeed: 2,
    bounceAmt: 0.05,
    baseY: -0.5,
    swaySpeed: 1.5,
    swayAmt: 0.03,
  },
  hungry: {
    bounceSpeed: 1.2,
    bounceAmt: 0.02,
    baseY: -0.55,
    swaySpeed: 0.8,
    swayAmt: 0.01,
  },
} as const;

function getRandomAnimation(): string {
  return IDLE_ANIMATIONS[Math.floor(Math.random() * IDLE_ANIMATIONS.length)];
}

const _projVec = new THREE.Vector3();

export default function Mushroom() {
  const cuteGltf = useGLTF("/Mushroom-cute.glb");
  const evilGltf = useGLTF("/Mushroom-evil.glb");

  const cuteGroupRef = useRef<THREE.Group>(null);
  const evilGroupRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  const evolution = useMushroomStore((s) => s.evolution);
  const isDark = evolution === "dark" || evolution === "demonic";

  const cuteAnimations = useAnimations(cuteGltf.animations, cuteGroupRef);
  const evilAnimations = useAnimations(evilGltf.animations, evilGroupRef);

  const { actions } = isDark ? evilAnimations : cuteAnimations;
  const groupRef = isDark ? evilGroupRef : cuteGroupRef;

  const currentAnimationRef = useRef<string | null>(null);
  const lastAnimationStartTime = useRef(0);
  const basePositionX = useRef(0);
  const consecutiveRightMoves = useRef(0);
  const consecutiveLeftMoves = useRef(0);

  const feedBounce = useRef(0);
  const mouthOpen = useRef(0);
  const lastFeedRef = useRef(0);
  const mistShimmy = useRef(0);
  const lastMistRef = useRef(0);
  const pokeJolt = useRef(0);
  const lastPokeRef = useRef(0);
  const pokeTimestamps = useRef<number[]>([]);
  const giftGlow = useRef(0);
  const lastGiftRef = useRef(0);

  // Helper: stop all actions and start a fresh one
  const startAnimation = useCallback(
    (name: string) => {
      // Stop all running actions first
      Object.values(actions).forEach((action) => {
        if (action) {
          action.stop();
        }
      });
      const action = actions[name];
      if (action) {
        action.clampWhenFinished = true;
        action.reset().setLoop(THREE.LoopOnce, 1).play();
        currentAnimationRef.current = name;
      }
    },
    [actions],
  );

  // Reset animation system when model switches
  useEffect(() => {
    currentAnimationRef.current = null;
    lastAnimationStartTime.current = 0;
    consecutiveRightMoves.current = 0;
    consecutiveLeftMoves.current = 0;

    if (groupRef.current) {
      groupRef.current.position.x = basePositionX.current;
    }

    if (actions && Object.keys(actions).length > 0) {
      startAnimation(getRandomAnimation());
    }
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize first animation
  useEffect(() => {
    if (
      actions &&
      Object.keys(actions).length > 0 &&
      !currentAnimationRef.current
    ) {
      startAnimation(getRandomAnimation());
    }
  }, [actions, startAnimation]);

  const handlePoke = useCallback(() => {
    const fireflyState = useFireflyStore.getState();
    if (fireflyState.phase === "scooping" && fireflyState.jarCount > 0) {
      const count = fireflyState.deliverGift();
      useMushroomStore.getState().giveFireflies(count);
      return;
    }

    const now = Date.now();
    const store = useMushroomStore.getState();

    if (now - lastPokeRef.current < POKE.cooldownMs) return;
    store.poke();

    const cutoff = now - POKE.annoyanceWindow;
    pokeTimestamps.current = pokeTimestamps.current.filter((t) => t > cutoff);
    pokeTimestamps.current.push(now);

    const annoyed = pokeTimestamps.current.length >= POKE.annoyanceThreshold;
    const msg = annoyed
      ? pickRandom(POKE_MESSAGES.annoyed)
      : pickRandom(POKE_MESSAGES.normal);
    store.receiveMessage(msg);
  }, []);

  useFrame(({ clock, camera, size }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const { hunger, lastFeedTime, lastMistTime, lastPokeTime, lastGiftTime } =
      useMushroomStore.getState();

    // Feed detection
    if (lastFeedTime > 0 && lastFeedTime !== lastFeedRef.current) {
      lastFeedRef.current = lastFeedTime;
      feedBounce.current = 1;
      mouthOpen.current = 1.2;
      useMushroomStore.getState().reactToEvent("fed");
    }
    if (mouthOpen.current > 0) mouthOpen.current -= delta * 0.8;

    // Mist detection
    if (lastMistTime > 0 && lastMistTime !== lastMistRef.current) {
      lastMistRef.current = lastMistTime;
      mistShimmy.current = 1;
      useMushroomStore.getState().reactToEvent("misted");
    }

    // Poke detection
    if (lastPokeTime > 0 && lastPokeTime !== lastPokeRef.current) {
      lastPokeRef.current = lastPokeTime;
      pokeJolt.current = 1;
    }

    // Gift detection
    if (lastGiftTime > 0 && lastGiftTime !== lastGiftRef.current) {
      lastGiftRef.current = lastGiftTime;
      giftGlow.current = 1;
      feedBounce.current = 0.8;
      useMushroomStore.getState().reactToEvent("gifted");
    }

    // Decay animations
    const anim = hunger >= BEHAVIOR.hungerThreshold ? ANIM.hungry : ANIM.happy;
    feedBounce.current *= 0.95;
    mistShimmy.current *= 0.94;
    pokeJolt.current *= 0.9;
    giftGlow.current *= 0.97;

    // Position: base Y + procedural effects
    groupRef.current.position.y =
      anim.baseY +
      Math.sin(t * anim.bounceSpeed) * anim.bounceAmt +
      feedBounce.current * Math.sin(t * 8) * 0.15 +
      mistShimmy.current * Math.sin(t * 18) * 0.04;

    // X position: let animation control when running, add procedural effects
    const isAnimating =
      currentAnimationRef.current &&
      actions[currentAnimationRef.current]?.isRunning();
    if (!isAnimating) {
      groupRef.current.position.x =
        basePositionX.current +
        pokeJolt.current * Math.sin(t * 20) * 0.05 +
        mistShimmy.current * Math.sin(t * 22) * 0.03;
    } else {
      const animatedX = groupRef.current.position.x;
      groupRef.current.position.x =
        animatedX +
        pokeJolt.current * Math.sin(t * 20) * 0.02 +
        mistShimmy.current * Math.sin(t * 22) * 0.01;
    }

    // Write world + screen position for interaction targets
    mushroomWorldPos.x = groupRef.current.position.x;
    mushroomWorldPos.y = groupRef.current.position.y;
    _projVec.set(
      groupRef.current.position.x,
      groupRef.current.position.y + 0.3,
      0.3,
    );
    _projVec.project(camera);
    mushroomWorldPos.screenX = ((_projVec.x + 1) / 2) * size.width;
    mushroomWorldPos.screenY = ((1 - _projVec.y) / 2) * size.height;

    // Rotation: sway + effects
    const swayAnim =
      hunger >= BEHAVIOR.hungerThreshold ? ANIM.hungry : ANIM.happy;
    groupRef.current.rotation.z =
      Math.sin(t * swayAnim.swaySpeed) * swayAnim.swayAmt +
      mistShimmy.current * Math.sin(t * 15) * 0.2;

    // Squash/stretch + poke squish (base scale 0.25 is on inner group)
    const squash = 1 + Math.sin(t * anim.bounceSpeed) * 0.02;
    const pokeSquish = 1 - pokeJolt.current * 0.08;
    groupRef.current.scale.set(
      1 / squash / pokeSquish,
      squash * pokeSquish,
      1 / squash / pokeSquish,
    );

    // Update shadow position
    if (shadowRef.current) {
      shadowRef.current.position.x = groupRef.current.position.x;
    }

    // Animation timing — start new animation when current finishes
    const currentAction = currentAnimationRef.current
      ? actions[currentAnimationRef.current]
      : null;
    const isCurrentlyRunning = currentAction?.isRunning() ?? false;
    const timeSinceLastStart = t - lastAnimationStartTime.current;

    const shouldStartNewAnimation =
      Object.keys(actions).length > 0 &&
      (!currentAnimationRef.current || !isCurrentlyRunning) &&
      timeSinceLastStart > 0.2;

    if (shouldStartNewAnimation) {
      // Apply movement offset from finished animation
      if (currentAnimationRef.current) {
        const offset = ANIMATION_OFFSETS[currentAnimationRef.current] ?? 0;
        if (offset !== 0) {
          basePositionX.current = Math.max(
            -2.5,
            Math.min(2.5, basePositionX.current + offset),
          );
          groupRef.current.position.x = basePositionX.current;
        }

        // Track consecutive moves
        if (currentAnimationRef.current === "Bounce_Right") {
          consecutiveRightMoves.current++;
          consecutiveLeftMoves.current = 0;
        } else if (currentAnimationRef.current === "Bounce_Left") {
          consecutiveLeftMoves.current++;
          consecutiveRightMoves.current = 0;
        } else {
          consecutiveRightMoves.current = 0;
          consecutiveLeftMoves.current = 0;
        }
      }

      // Filter animations based on consecutive move limits
      let availableAnimations = [...IDLE_ANIMATIONS];
      if (consecutiveRightMoves.current >= 3) {
        availableAnimations = availableAnimations.filter(
          (a) => a !== "Bounce_Right",
        );
      }
      if (consecutiveLeftMoves.current >= 3) {
        availableAnimations = availableAnimations.filter(
          (a) => a !== "Bounce_Left",
        );
      }
      // Prevent moving off-screen
      if (basePositionX.current >= 2.2) {
        availableAnimations = availableAnimations.filter(
          (a) => a !== "Bounce_Right",
        );
      }
      if (basePositionX.current <= -2.2) {
        availableAnimations = availableAnimations.filter(
          (a) => a !== "Bounce_Left",
        );
      }

      const nextAnimation =
        availableAnimations[
          Math.floor(Math.random() * availableAnimations.length)
        ];
      if (actions[nextAnimation]) {
        // Stop all actions before starting a new one
        Object.values(actions).forEach((a) => a?.stop());
        actions[nextAnimation]!.clampWhenFinished = true;
        actions[nextAnimation]!.reset().setLoop(THREE.LoopOnce, 1).play();
        currentAnimationRef.current = nextAnimation;
        lastAnimationStartTime.current = t;
      }
    }
  });

  return (
    <>
      {/* Blob shadow */}
      <mesh
        ref={shadowRef}
        position={[0, -0.98, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-10}
      >
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      <group
        ref={cuteGroupRef}
        visible={!isDark}
        onPointerDown={!isDark ? handlePoke : undefined}
      >
        <group scale={0.3}>
          <primitive object={cuteGltf.scene} />
        </group>
      </group>
      <group
        ref={evilGroupRef}
        visible={isDark}
        onPointerDown={isDark ? handlePoke : undefined}
      >
        <group scale={0.3}>
          <primitive object={evilGltf.scene} />
        </group>
      </group>
    </>
  );
}
