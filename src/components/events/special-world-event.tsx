"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface SpecialWorldEventProps {
  title: string;
  description: string;
  targetImage: string;
  isTarget: boolean;
  isHost: boolean;
  onDismiss: () => void;
}

function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: 6,
        height: 6,
        background: "radial-gradient(circle, #fbbf24, #f59e0b)",
        boxShadow: "0 0 8px 2px rgba(251,191,36,0.6)",
        animation: `specialSparkle 1.8s ${delay}s ease-in-out infinite`,
      }}
    />
  );
}

const sparkles = Array.from({ length: 24 }, (_, i) => ({
  delay: Math.random() * 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
}));

export function SpecialWorldEventCard({ title, description, targetImage, isTarget, isHost, onDismiss }: SpecialWorldEventProps) {
  const [flash, setFlash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0f0518 50%, #000 100%)",
        }}
      />

      {sparkles.map((s, i) => (
        <Sparkle key={i} delay={s.delay} x={s.x} y={s.y} />
      ))}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "conic-gradient(from 0deg, transparent, rgba(168,85,247,0.08), transparent, rgba(251,191,36,0.08), transparent)",
          animation: "specialRotate 8s linear infinite",
        }}
      />

      {flash && (
        <div className="absolute inset-0 bg-white/80 z-30 animate-pulse" />
      )}

      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-md">
        <p
          className="text-xs tracking-[0.3em] uppercase mb-3 font-bold"
          style={{
            background: "linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            animation: "specialShimmer 2s linear infinite",
            backgroundSize: "200% 100%",
          }}
        >
          ★ Special World Event ★
        </p>

        <h2
          className="text-3xl font-black mb-6"
          style={{
            background: "linear-gradient(180deg, #fff 0%, #fbbf24 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 40px rgba(251,191,36,0.3)",
          }}
        >
          {title}
        </h2>

        {isTarget ? (
          <div className="rounded-2xl border-4 border-amber-400 overflow-hidden shadow-2xl shadow-amber-500/30 mb-6" style={{ animation: "specialPulse 2s ease-in-out infinite" }}>
            <img src={targetImage} alt="You are the target!" className="w-64 h-64 object-contain bg-white" />
          </div>
        ) : (
          <div
            className="rounded-xl px-8 py-6 max-w-sm mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(168,85,247,0.15))",
              border: "1px solid rgba(251,191,36,0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p className="text-lg font-semibold text-white leading-relaxed">{description}</p>
          </div>
        )}

        {isHost && (
          <Button
            onClick={onDismiss}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-8"
          >
            Continue
          </Button>
        )}
      </div>

      <style jsx>{`
        @keyframes specialSparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes specialRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes specialShimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
        @keyframes specialPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(251,191,36,0.3); }
          50% { transform: scale(1.03); box-shadow: 0 0 40px rgba(251,191,36,0.5); }
        }
      `}</style>
    </div>
  );
}
