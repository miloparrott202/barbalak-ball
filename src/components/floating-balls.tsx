"use client";

import { useEffect, useRef, useState } from "react";

const BALL_COUNT = 10;
const BALL_FILES = Array.from({ length: BALL_COUNT }, (_, i) => `/balls/ball-${i + 1}.png`);
const MAX_BALLS = 20;

interface Ball {
  id: number;
  src: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

let nextId = 0;

function randomBall(density: number, speedMin: number, speedMax: number): Ball {
  const src = BALL_FILES[Math.floor(Math.random() * BALL_FILES.length)];
  const angle = Math.random() * Math.PI * 2;
  const speed = speedMin + Math.random() * (speedMax - speedMin);
  const size = 40 + Math.random() * 30;
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (edge) {
    case 0: x = Math.random() * 100; y = -10; break;
    case 1: x = 110; y = Math.random() * 100; break;
    case 2: x = Math.random() * 100; y = 110; break;
    default: x = -10; y = Math.random() * 100; break;
  }
  return {
    id: nextId++,
    src,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
  };
}

export function FloatingBalls() {
  const [balls, setBalls] = useState<Ball[]>([]);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);
  const paramsRef = useRef({ density: 5, speedMin: 15, speedMax: 45 });

  useEffect(() => {
    const density = 3 + Math.floor(Math.random() * 8);
    const speedMin = 15 + Math.random() * 10;
    const speedMax = speedMin + 15 + Math.random() * 15;
    paramsRef.current = { density, speedMin, speedMax };

    const initial: Ball[] = [];
    for (let i = 0; i < density; i++) {
      const b = randomBall(density, speedMin, speedMax);
      b.x = Math.random() * 100;
      b.y = Math.random() * 100;
      initial.push(b);
    }
    setBalls(initial);
    lastRef.current = performance.now();

    function tick(now: number) {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const p = paramsRef.current;

      setBalls((prev) => {
        let next = prev.map((b) => ({
          ...b,
          x: b.x + b.vx * dt,
          y: b.y + b.vy * dt,
        }));

        next = next.filter(
          (b) => b.x > -15 && b.x < 115 && b.y > -15 && b.y < 115,
        );

        if (next.length < p.density && Math.random() < 0.03) {
          next.push(randomBall(p.density, p.speedMin, p.speedMax));
        }

        if (next.length > MAX_BALLS) {
          next = next.slice(next.length - MAX_BALLS);
        }

        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {balls.map((b) => (
        <img
          key={b.id}
          src={b.src}
          alt=""
          className="absolute rounded-full opacity-40"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size,
          }}
        />
      ))}
    </div>
  );
}
