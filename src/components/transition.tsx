"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { MinigameType } from "@/lib/types";
import { FloatingBalls } from "@/components/floating-balls";

const LABELS: Record<MinigameType, string> = {
  charades: "Charades",
  trivia: "Trivia",
  scategories: "Scategories",
  "fifty-fifty": "50 / 50",
};

const DESCRIPTIONS: Record<MinigameType, string> = {
  charades: "One player acts it out. Everyone else guesses!",
  trivia: "Answer fast. Answer right. Don't choke.",
  scategories: "Think of a word. Defend your answer. Survive the vote.",
  "fifty-fifty": "Flip the coin of fate. Penalty or bonus?",
};

interface TransitionProps {
  minigame: MinigameType;
  onComplete: () => void;
}

const STEPS = ["Ready?", "Set?", "BARBALAK!!!"];

export function Transition({ minigame, onComplete }: TransitionProps) {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStep(0), 600));
    timers.push(setTimeout(() => setStep(1), 1600));
    timers.push(setTimeout(() => setStep(2), 2600));
    timers.push(setTimeout(() => onComplete(), 3800));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 relative">
      <FloatingBalls />
      <div className="mb-8 text-center relative z-10">
        <p className="text-xs tracking-widest uppercase text-zinc-400 mb-1">
          Up Next
        </p>
        <h2 className="text-3xl font-extrabold text-zinc-900">
          {LABELS[minigame]}
        </h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-xs">
          {DESCRIPTIONS[minigame]}
        </p>
      </div>

      <div className="flex items-center gap-6 relative z-10">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "text-2xl font-black transition-all duration-300 origin-center",
              step >= i
                ? i === 2
                  ? "text-emerald-600 scale-125 ml-2"
                  : "text-zinc-900 scale-110"
                : "text-zinc-200 scale-100",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
