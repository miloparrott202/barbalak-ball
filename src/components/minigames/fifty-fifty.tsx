"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import type { Player, CurrentRound } from "@/lib/types";

interface FiftyFiftyProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

const TYPE_OPTIONS = ["PENALTY", "BONUS"];
const RARITY_OPTIONS = ["Common", "Rare", "Legendary"];

function SlotMachine({ options, finalValue, duration, onDone }: {
  options: string[];
  finalValue: string;
  duration: number;
  onDone: () => void;
}) {
  const [display, setDisplay] = useState(options[0]);
  const [spinning, setSpinning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % options.length;
      setDisplay(options[idx]);
    }, 80);

    const timer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(finalValue);
      setSpinning(false);
      setTimeout(onDone, 400);
    }, duration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timer);
    };
  }, [options, finalValue, duration, onDone]);

  return (
    <div className={cn(
      "text-4xl font-black uppercase tracking-wider transition-all duration-300",
      spinning ? "blur-[1px] scale-105" : "blur-0 scale-100",
    )}>
      {display}
    </div>
  );
}

export function FiftyFifty({ round, players, currentPlayerId, isHost, onAdvance }: FiftyFiftyProps) {
  const { phase, data, selectedPlayerIds } = round;
  const selectedId = selectedPlayerIds[0];
  const isSelected = currentPlayerId === selectedId;
  const selectedPlayer = players.find((p) => p.id === selectedId);
  const type = data.type as string;
  const rarity = data.rarity as string;
  const action = data.action as string;

  const [revealStep, setRevealStep] = useState(0);
  const [legendaryFlash, setLegendaryFlash] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleFlip = useCallback(() => {
    onAdvance("active");
  }, [onAdvance]);

  const handleTypeRevealed = useCallback(() => {
    setRevealStep(2);
  }, []);

  const handleRarityRevealed = useCallback(() => {
    setRevealStep(3);
    if (rarity === "legendary") {
      setLegendaryFlash(true);
      setShaking(true);
      setTimeout(() => setLegendaryFlash(false), 2000);
      setTimeout(() => setShaking(false), 1500);
    }
    setTimeout(() => {
      onAdvance("result");
    }, rarity === "legendary" ? 2500 : rarity === "rare" ? 1000 : 400);
  }, [rarity, onAdvance]);

  useEffect(() => {
    if (phase === "active" && revealStep === 0) {
      setRevealStep(1);
    }
  }, [phase, revealStep]);

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">50 / 50</h2>
        <SelectedPlayer player={selectedPlayer} label="Facing Fate" />
        <p className="text-sm text-zinc-400 mt-4">Penalty or Bonus? Only one way to find out.</p>
        {(isHost || isSelected) && (
          <Button onClick={handleFlip} className="mt-6" size="lg">
            Flip the Coin
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] px-4 text-center relative",
        shaking && "animate-shake",
      )}>
        {legendaryFlash && (
          <div className="fixed inset-0 bg-emerald-400/30 animate-pulse pointer-events-none z-50" />
        )}

        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase text-zinc-400 mb-4">Revealing...</p>

          {revealStep >= 1 && revealStep < 2 && (
            <div className="mb-6">
              <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">Type</p>
              <SlotMachine
                options={TYPE_OPTIONS}
                finalValue={type.toUpperCase()}
                duration={1500}
                onDone={handleTypeRevealed}
              />
            </div>
          )}

          {revealStep >= 2 && revealStep < 3 && (
            <div className="mb-6">
              <div className={cn(
                "text-2xl font-black uppercase mb-4",
                type === "penalty" ? "text-red-500" : "text-emerald-500",
              )}>
                {type.toUpperCase()}
              </div>
              <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">Rarity</p>
              <SlotMachine
                options={RARITY_OPTIONS}
                finalValue={rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                duration={1500}
                onDone={handleRarityRevealed}
              />
            </div>
          )}

          {revealStep >= 3 && (
            <div className="mb-6">
              <div className={cn(
                "text-2xl font-black uppercase mb-2",
                type === "penalty" ? "text-red-500" : "text-emerald-500",
              )}>
                {type.toUpperCase()}
              </div>
              <div className={cn(
                "text-xl font-bold uppercase mb-4",
                rarity === "legendary" ? "text-amber-500" : rarity === "rare" ? "text-purple-500" : "text-zinc-500",
              )}>
                {rarity.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center px-4 text-center py-8 relative",
        rarity === "legendary" && "animate-pulse-slow",
      )}>
        {rarity === "legendary" && (
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/40 to-transparent pointer-events-none rounded-3xl" />
        )}
        {rarity === "rare" && (
          <div className="absolute inset-0 bg-gradient-to-b from-purple-100/20 to-transparent pointer-events-none rounded-3xl" />
        )}

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
              ? "bg-amber-100 text-amber-600 ring-2 ring-amber-300"
              : rarity === "rare"
                ? "bg-purple-50 text-purple-600"
                : "bg-zinc-100 text-zinc-500",
          )}
        >
          {rarity}
        </span>
        <div className={cn(
          "rounded-xl px-8 py-6 max-w-sm border",
          rarity === "legendary" ? "bg-amber-50 border-amber-300 shadow-lg shadow-amber-100" :
          rarity === "rare" ? "bg-purple-50 border-purple-200" :
          "bg-zinc-50 border-zinc-200",
        )}>
          <p className={cn(
            "text-lg font-semibold",
            rarity === "legendary" ? "text-amber-900" : "text-zinc-900",
          )}>{action}</p>
        </div>
        <p className="text-sm text-zinc-400 mt-4">
          {selectedPlayer?.name} must comply.
        </p>
      </div>
    );
  }

  return null;
}
