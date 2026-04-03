"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PointShop } from "./point-shop";
import { getSupabase } from "@/lib/supabase";
import { updateGameRound } from "@/lib/game-engine";
import { Info } from "lucide-react";
import type { Player, Game } from "@/lib/types";

interface HudProps {
  player: Player;
  allPlayers: Player[];
  gameId: string;
  bullshitEnabled?: boolean;
  game?: Game | null;
}

export function Hud({ player, allPlayers, gameId, bullshitEnabled, game }: HudProps) {
  const [shopOpen, setShopOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCallBullshit = useCallback(async () => {
    if (!game?.current_round) return;
    await updateGameRound(gameId, {
      ...game.current_round,
      data: {
        ...game.current_round.data,
        bullshitCaller: player.id,
        bullshitCallerName: player.name,
        bullshitActive: true,
        paused: true,
      },
    });
  }, [game, gameId, player.id, player.name]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur border-b border-zinc-200">
        <span className="text-sm font-medium text-zinc-700 truncate max-w-[30%]">
          {player.name}
        </span>

        {bullshitEnabled && (
          <div className="relative">
            <button
              onClick={handleCallBullshit}
              className="rounded-full px-3 py-1 text-xs font-bold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
            >
              Call Bullshit
            </button>
          </div>
        )}

        <button
          onClick={() => setShopOpen(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors",
            "bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95",
          )}
        >
          <span className="text-base">★</span>
          {player.score} pts
        </button>
      </div>

      <PointShop
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        player={player}
        allPlayers={allPlayers}
        gameId={gameId}
      />
    </>
  );
}

export function BullshitOverlay({
  callerName,
  isHost,
  onDismiss,
}: {
  callerName: string;
  isHost: boolean;
  onDismiss: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
      <h1 className="text-4xl font-black text-red-500 mb-4 tracking-wide">
        {callerName} has called bullshit.
      </h1>

      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors mb-6"
      >
        <Info className="h-5 w-5" />
        <span className="text-sm underline">What does this mean?</span>
      </button>

      {showTooltip && (
        <div className="max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {callerName} has called bullshit. They will now make their case against the accused
            (google shit on their phone). If the defendant is found guilty, they must finish their drink.
            If the defendant is found innocent, vice versa. If they come to a stalemate, the room decides.
          </p>
        </div>
      )}

      {isHost && (
        <button
          onClick={onDismiss}
          className="rounded-lg bg-white text-zinc-900 px-8 py-3 font-semibold hover:bg-zinc-100 transition-colors"
        >
          Resume Game
        </button>
      )}

      {!isHost && (
        <p className="text-sm text-zinc-500">Waiting for host to resume...</p>
      )}
    </div>
  );
}
