"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Player, CurrentRound } from "@/lib/types";

interface FiftyFiftyProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

export function FiftyFifty({ round, players, currentPlayerId, isHost, onAdvance }: FiftyFiftyProps) {
  const { phase, data, selectedPlayerIds } = round;
  const selectedId = selectedPlayerIds[0];
  const isSelected = currentPlayerId === selectedId;
  const selectedPlayer = players.find((p) => p.id === selectedId);
  const type = data.type as string;
  const rarity = data.rarity as string;
  const action = data.action as string;

  const [revealed, setRevealed] = useState(false);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    onAdvance("result");
  }, [onAdvance]);

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">50 / 50</h2>
        <p className="text-zinc-500 mb-6">
          <span className="font-semibold text-zinc-700">{selectedPlayer?.name}</span> must face fate.
        </p>
        <p className="text-sm text-zinc-400">Penalty or Bonus? Only one way to find out.</p>
        {(isHost || isSelected) && (
          <Button onClick={() => onAdvance("active")} className="mt-6">
            Flip the Coin
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active" || phase === "result") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        {!revealed && phase === "active" ? (
          <>
            <div className="text-6xl mb-6 animate-bounce">🪙</div>
            <Button onClick={handleReveal} size="lg">
              Reveal
            </Button>
          </>
        ) : (
          <>
            <span
              className={cn(
                "rounded-full px-4 py-1 text-sm font-bold uppercase tracking-wider mb-3",
                type === "penalty"
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600",
              )}
            >
              {type}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-medium uppercase tracking-wider mb-6",
                rarity === "legendary"
                  ? "bg-amber-50 text-amber-600"
                  : rarity === "rare"
                    ? "bg-zinc-200 text-zinc-600"
                    : "bg-zinc-100 text-zinc-500",
              )}
            >
              {rarity}
            </span>
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-8 py-6 max-w-sm">
              <p className="text-lg font-semibold text-zinc-900">{action}</p>
            </div>
            <p className="text-sm text-zinc-400 mt-4">
              {selectedPlayer?.name} must comply.
            </p>
          </>
        )}
      </div>
    );
  }

  return null;
}
