import { useEffect, useRef } from "react";

type RainDrop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
};

type RainDot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  alpha: number;
};

type ObstacleRect = {
  left: number;
  right: number;
  top: number;
  radius: number;
};

export function RainLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    let rafId = 0;
    let lastTime = performance.now();
    let spawnAccumulator = 0;
    let cloudDrift = 0;
    const streaks: RainDrop[] = [];
    const dots: RainDot[] = [];
    const maxDrops = 220;
    const spawnPerSecond = 125;
    const gravity = 1500;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const collectObstacles = (): ObstacleRect[] => {
      const cardNodes = document.querySelectorAll(".rain-proof");
      const obstacles: ObstacleRect[] = [];
      cardNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= height) {
          const styles = window.getComputedStyle(node);
          const topLeftRadius = Number.parseFloat(styles.borderTopLeftRadius) || 0;
          const topRightRadius =
            Number.parseFloat(styles.borderTopRightRadius) || 0;
          const maxUsefulRadius = Math.max(
            0,
            Math.min(rect.width / 2, rect.height / 2),
          );
          const radius = Math.min(
            Math.max(topLeftRadius, topRightRadius),
            maxUsefulRadius,
          );

          obstacles.push({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            radius,
          });
        }
      });
      return obstacles;
    };

    const getSurfaceYAtX = (obstacle: ObstacleRect, x: number) => {
      const { left, right, top, radius } = obstacle;
      if (radius <= 0) {
        return top;
      }

      const leftCurveEnd = left + radius;
      if (x < leftCurveEnd) {
        const cx = leftCurveEnd;
        const cy = top + radius;
        const dx = x - cx;
        const inside = Math.max(0, radius * radius - dx * dx);
        return cy - Math.sqrt(inside);
      }

      const rightCurveStart = right - radius;
      if (x > rightCurveStart) {
        const cx = rightCurveStart;
        const cy = top + radius;
        const dx = x - cx;
        const inside = Math.max(0, radius * radius - dx * dx);
        return cy - Math.sqrt(inside);
      }

      return top;
    };

    const getSpawnY = () => {
      const nav = document.querySelector(".top-nav");
      if (!nav) {
        return 0;
      }
      return nav.getBoundingClientRect().bottom - 6;
    };

    const spawnDrop = () => {
      if (streaks.length >= maxDrops) {
        return;
      }

      const spawnY = getSpawnY();
      const initialY = spawnY + Math.random() * 8;
      streaks.push({
        x: Math.random() * width,
        y: initialY,
        vx: (Math.random() - 0.5) * 34,
        vy: 370 + Math.random() * 240,
        len: 11 + Math.random() * 13,
        alpha: 0.25 + Math.random() * 0.5,
      });
    };

    const drawCloudCover = () => {
      const xShift = (cloudDrift % (width + 320)) - 320;
      context.fillStyle = "rgba(71, 85, 105, 0.2)";

      for (let i = 0; i < 5; i += 1) {
        const baseX = xShift + i * (width / 2.9);
        const baseY = -24 + (i % 2) * 16;

        context.beginPath();
        context.ellipse(baseX + 60, baseY + 26, 92, 34, 0, 0, Math.PI * 2);
        context.ellipse(baseX + 138, baseY + 18, 108, 40, 0, 0, Math.PI * 2);
        context.ellipse(baseX + 226, baseY + 29, 90, 33, 0, 0, Math.PI * 2);
        context.fill();
      }
    };

    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;

      spawnAccumulator += spawnPerSecond * dt;
      while (spawnAccumulator >= 1) {
        spawnDrop();
        spawnAccumulator -= 1;
      }

      const obstacles = collectObstacles();

      context.clearRect(0, 0, width, height);
      cloudDrift += dt * 12;
      drawCloudCover();
      context.lineWidth = 1.4;
      context.lineCap = "round";

      for (let i = streaks.length - 1; i >= 0; i -= 1) {
        const drop = streaks[i];
        const prevY = drop.y;
        drop.vy += gravity * dt;
        drop.y += drop.vy * dt;
        drop.x += drop.vx * dt;

        let collided = false;
        if (drop.y > -20 && drop.y < height + 20) {
          for (let j = 0; j < obstacles.length; j += 1) {
            const obstacle = obstacles[j];
            const surfaceY = getSurfaceYAtX(obstacle, drop.x);
            const hitTop =
              prevY + drop.len < surfaceY &&
              drop.y + drop.len >= surfaceY &&
              drop.x >= obstacle.left - 6 &&
              drop.x <= obstacle.right + 6;

            if (hitTop) {
              dots.push({
                x: drop.x + (Math.random() - 0.5) * 1.5,
                y: surfaceY - 1.1,
                vx: drop.vx * 0.2 + (Math.random() - 0.5) * 38,
                vy: -18 - Math.random() * 24,
                radius: 1.1 + Math.random() * 1,
                life: 0.14 + Math.random() * 0.14,
                alpha: Math.min(0.92, drop.alpha + 0.32),
              });
              collided = true;
              break;
            }
          }
        }

        if (collided) {
          streaks.splice(i, 1);
          continue;
        }

        if (
          drop.y - drop.len > height + 60 ||
          drop.x < -70 ||
          drop.x > width + 70
        ) {
          streaks.splice(i, 1);
          continue;
        }

        context.strokeStyle = `rgba(161, 199, 255, ${drop.alpha})`;
        context.beginPath();
        context.moveTo(drop.x, drop.y - drop.len);
        context.lineTo(drop.x - drop.vx * 0.028, drop.y);
        context.stroke();
      }

      for (let i = dots.length - 1; i >= 0; i -= 1) {
        const dot = dots[i];
        dot.life -= dt;
        dot.vy += gravity * 0.12 * dt;
        dot.x += dot.vx * dt;
        dot.y += dot.vy * dt;

        if (dot.life <= 0) {
          dots.splice(i, 1);
          continue;
        }

        const lifeRatio = Math.max(0, Math.min(1, dot.life / 0.28));
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(161, 199, 255, ${dot.alpha * lifeRatio})`;
        context.fill();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas aria-hidden className="rain-layer" ref={canvasRef} />;
}
