"use client";

import { cn } from "@/lib/utils";
import { icons } from "@/lib/content";
import { User, Smartphone, Monitor } from "lucide-react";

export interface Player {
  id: string;
  name: string;
  icon_id: string;
  is_phoneless_phil: boolean;
}

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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
            {icons.find((i) => i.id === player.icon_id)?.label ?? player.icon_id}
          </div>
          <span className="flex-1 text-sm font-medium text-zinc-900 truncate">
            {player.name}
          </span>
          {player.is_phoneless_phil ? (
            <Monitor className="h-4 w-4 text-zinc-400" />
          ) : (
            <Smartphone className="h-4 w-4 text-zinc-400" />
          )}
        </li>
      ))}
    </ul>
  );
}
