"use client";

import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ScoreboardProps {
  players: Player[];
  pointThreshold: number;
}

export function Scoreboard({ players, pointThreshold }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const leader = sorted[0]?.score ?? 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-zinc-900 mb-1">Scoreboard</h2>
      <p className="text-sm text-zinc-500 mb-6">First to {pointThreshold} wins</p>

      <div className="w-full max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
              i === 0 && leader > 0
                ? "bg-amber-50 border border-amber-200"
                : "bg-zinc-50 border border-zinc-100",
            )}
          >
            <span className="text-lg font-bold text-zinc-400 w-6 text-right">
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-zinc-800 truncate">
              {p.name}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                i === 0 && leader > 0 ? "text-amber-600" : "text-zinc-600",
              )}
            >
              {p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
