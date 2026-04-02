"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import type { Player, CurrentRound } from "@/lib/types";

interface CharadesProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

export function Charades({ round, players, currentPlayerId, isHost, onAdvance }: CharadesProps) {
  const { phase, data, selectedPlayerIds } = round;
  const actorId = selectedPlayerIds[0];
  const isActor = currentPlayerId === actorId;
  const actor = players.find((p) => p.id === actorId);
  const phrase = data.phrase as string;

  const [timer, setTimer] = useState(20);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleStart = useCallback(() => {
    onAdvance("active");
  }, [onAdvance]);

  const handleCorrect = useCallback(() => {
    setDeciding(true);
    onAdvance("result", { success: true });
  }, [onAdvance]);

  const handleFail = useCallback(() => {
    setDeciding(true);
    onAdvance("result", { success: false });
  }, [onAdvance]);

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Charades</h2>
        <SelectedPlayer player={actor} label="Acting" />

        {isActor && (
          <div className="mt-4 p-6 rounded-xl bg-zinc-50 border border-zinc-200">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Your phrase</p>
            <p className="text-2xl font-bold text-zinc-900">{phrase}</p>
          </div>
        )}

        {isHost && (
          <Button onClick={handleStart} className="mt-6">
            Start Timer
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div
          className={cn(
            "text-6xl font-black tabular-nums mb-4",
            timer <= 10 ? "text-red-500" : "text-zinc-900",
          )}
        >
          {timer}
        </div>
        <SelectedPlayer player={actor} label="Acting" />

        {isActor && (
          <div className="mt-6 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <p className="text-xl font-bold text-zinc-900">{phrase}</p>
          </div>
        )}

        {isHost && (
          <div className="flex gap-3 mt-8">
            <Button onClick={handleCorrect} disabled={deciding}>They Got It!</Button>
            <Button variant="danger" onClick={handleFail} disabled={deciding}>
              Time / Give Up
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const success = data.success as boolean;
    return (
      <div className="flex flex-col items-center justify-center px-4 text-center py-8">
        <div
          className={cn(
            "text-6xl mb-4",
            success ? "text-emerald-500" : "text-red-400",
          )}
        >
          {success ? "✓" : "✗"}
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">
          {success ? "Nailed It!" : "Not This Time"}
        </h2>
        {phrase && (
          <p className="text-zinc-500 mb-2">
            The phrase was: <span className="font-semibold text-zinc-700">{phrase}</span>
          </p>
        )}
        {success && (
          <p className="text-emerald-600 font-semibold">
            +5 pts to {actor?.name}
          </p>
        )}
      </div>
    );
  }

  return null;
}
