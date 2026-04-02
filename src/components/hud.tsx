"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PointShop } from "./point-shop";
import type { Player } from "@/lib/types";

interface HudProps {
  player: Player;
  allPlayers: Player[];
  gameId: string;
}

export function Hud({ player, allPlayers, gameId }: HudProps) {
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur border-b border-zinc-200">
        <span className="text-sm font-medium text-zinc-700 truncate max-w-[50%]">
          {player.name}
        </span>
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
