import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import { useAssetProgress } from "../hooks/useAssetProgress";
import { music } from "../audio/musicService";
import styles from "./TitleScreen.module.css";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  delay: number;
  alpha: number;
  isBackground: boolean;
  arrived: boolean;
}

/** Pre-render a firefly glow sprite once */
function makeGlowSprite(): HTMLCanvasElement {
  const s = 32;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255, 245, 220, 1)");
  g.addColorStop(0.12, "rgba(255, 235, 180, 0.95)");
  g.addColorStop(0.35, "rgba(255, 215, 130, 0.45)");
  g.addColorStop(0.65, "rgba(255, 195, 90, 0.1)");
  g.addColorStop(1, "rgba(255, 180, 60, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return c;
}

function sampleTextPositions(
  text: string,
  canvasW: number,
  canvasH: number,
  count: number,
): { x: number; y: number }[] {
  const offscreen = document.createElement("canvas");
  const fontSize = Math.min(canvasW * 0.16, 140);
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const ctx = offscreen.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${fontSize}px "Arial Black", "Impact", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasW / 2, canvasH * 0.35);

  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const pixels = imageData.data;
  const candidates: { x: number; y: number }[] = [];
  const step = 2;
  for (let y = 0; y < canvasH; y += step) {
    for (let x = 0; x < canvasW; x += step) {
      if (pixels[(y * canvasW + x) * 4 + 3] > 128) {
        candidates.push({ x, y });
      }
    }
  }

  // Shuffle and take
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

export default function TitleScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startGame = useGameStore((s) => s.startGame);
  const startedRef = useRef(false);
  const { progress, loaded } = useAssetProgress();
  const loadedRef = useRef(false);
  loadedRef.current = loaded;
  const progressRef = useRef(0);
  progressRef.current = progress;

  // Start music as soon as the title screen mounts; musicService retries on
  // first user gesture if the browser blocks autoplay.
  useEffect(() => { music.play(); }, []);

  const handleClick = useCallback(() => {
    if (startedRef.current || !loadedRef.current) return;
    startedRef.current = true;
    overlayRef.current?.classList.add(styles.fadeOut);
    setTimeout(() => startGame(), 600);
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;
    let startTime = 0;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = window.innerWidth;
    const H = window.innerHeight;

    const sprite = makeGlowSprite();

    const TEXT_COUNT = 1200;
    const BG_COUNT = 35;
    const textTargets = sampleTextPositions("Shroom", W, H, TEXT_COUNT);

    const particles: Particle[] = [];

    for (let i = 0; i < textTargets.length; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        targetX: textTargets[i].x,
        targetY: textTargets[i].y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 1.0 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        delay: Math.random() * 0.6,
        alpha: 0.75 + Math.random() * 0.25,
        isBackground: false,
        arrived: false,
      });
    }

    for (let i = 0; i < BG_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        targetX: 0,
        targetY: 0,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: 1.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        delay: 0,
        alpha: 0.2 + Math.random() * 0.25,
        isBackground: true,
        arrived: false,
      });
    }

    const SWARM_END = 1.5;
    const CONVERGE_DURATION = 2.0;
    const CONVERGE_END = SWARM_END + CONVERGE_DURATION;
    const SUBTITLE_FADE_START = CONVERGE_END + 0.5;
    const STUDIO_FADE_START = SUBTITLE_FADE_START + 0.8;

    let displayProgress = 0;
    let loadedAt = 0; // timestamp when loading finished

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      // Track when loading first completes
      if (loadedRef.current && !loadedAt) loadedAt = timestamp;

      // Smooth loading bar: time-based curve to 90%, snaps to 100% when done
      const fakeTarget = loadedRef.current ? 1 : 0.9 * (1 - Math.exp(-elapsed * 0.12));
      displayProgress += (fakeTarget - displayProgress) * 0.05;

      // Show bar for 500ms after loading completes so user sees 100%
      const showBar = !loadedAt || (timestamp - loadedAt) < 500;

      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        if (p.isBackground) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
          const bob = Math.sin(elapsed * 1.5 + p.phase) * 0.3;
          drawSprite(
            ctx,
            sprite,
            p.x,
            p.y + bob,
            p.size,
            p.alpha * (0.7 + 0.3 * Math.sin(elapsed * 2 + p.phase)),
          );
        } else if (elapsed < SWARM_END) {
          // Swarm — drift randomly
          p.x += p.vx + Math.sin(elapsed * 2 + p.phase) * 0.5;
          p.y += p.vy + Math.cos(elapsed * 1.7 + p.phase) * 0.5;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
          drawSprite(ctx, sprite, p.x, p.y, p.size, p.alpha * 0.6);
        } else if (!p.arrived) {
          // Converge — lerp strongly toward target, snap when close
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 1) {
            // Close enough — snap to target
            p.x = p.targetX;
            p.y = p.targetY;
            p.arrived = true;
          } else {
            // Strong pull — move 20% of remaining distance each frame
            const strength = 0.2;
            p.x += dx * strength;
            p.y += dy * strength;
          }
          const flicker = 0.7 + 0.3 * Math.sin(elapsed * 4 + p.phase);
          drawSprite(ctx, sprite, p.x, p.y, p.size, p.alpha * flicker);
        } else {
          // Arrived — tiny shimmer at target position
          const bobX = Math.sin(elapsed * 1.5 + p.phase) * 0.4;
          const bobY = Math.cos(elapsed * 1.1 + p.phase * 1.3) * 0.4;
          const drawX = p.targetX + bobX;
          const drawY = p.targetY + bobY;
          const pulse = 0.8 + 0.2 * Math.sin(elapsed * 2.5 + p.phase);
          drawSprite(ctx, sprite, drawX, drawY, p.size, p.alpha * pulse);
        }
      }

      // Loading bar or "Tap to Start"
      if (elapsed > SUBTITLE_FADE_START) {
        const subtitleAlpha = Math.min(
          1,
          (elapsed - SUBTITLE_FADE_START) / 1.5,
        );

        if (loadedRef.current && !showBar) {
          // Ready — show "Tap to Start"
          const pulse = 0.7 + 0.3 * Math.sin(elapsed * 2);
          ctx.save();
          ctx.globalAlpha = subtitleAlpha * pulse;
          ctx.fillStyle = "#ffffff";
          ctx.font = `${Math.min(W * 0.04, 28)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Tap to Start", W / 2, H * 0.52);
          ctx.restore();
        } else {
          // Loading — show progress bar
          const barW = Math.min(W * 0.4, 240);
          const barH = 4;
          const barX = W / 2 - barW / 2;
          const barY = H * 0.52;
          ctx.save();
          ctx.globalAlpha = subtitleAlpha * 0.5;
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.beginPath();
          ctx.roundRect(barX, barY, barW, barH, barH / 2);
          ctx.fill();
          ctx.globalAlpha = subtitleAlpha * 0.9;
          ctx.fillStyle = "rgba(255, 230, 160, 0.8)";
          ctx.beginPath();
          ctx.roundRect(barX, barY, barW * displayProgress, barH, barH / 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Studio credit
      if (elapsed > STUDIO_FADE_START) {
        const creditAlpha = Math.min(1, (elapsed - STUDIO_FADE_START) / 1.5);
        ctx.save();
        ctx.globalAlpha = creditAlpha * 0.6;
        ctx.fillStyle = "#cccccc";
        ctx.font = `${Math.min(W * 0.025, 16)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "A Milette Gillow & Stone Fruit Studios Game",
          W / 2,
          H * 0.59,
        );
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={handleClick}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  const d = size * 3.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - d / 2, y - d / 2, d, d);
  ctx.restore();
}
