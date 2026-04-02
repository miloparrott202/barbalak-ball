"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { Player } from "@/lib/types";

interface PlayerListProps {
  players: Player[];
  className?: string;
}

export function PlayerList({ players, className }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className={cn("py-12 text-center text-zinc-400", className)}>
        <User className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
        <p className="text-sm">Waiting for players to join&hellip;</p>
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-zinc-100", className)}>
      {players.map((player) => (
        <li key={player.id} className="flex items-center gap-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 text-sm font-medium text-zinc-900 truncate">
            {player.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
