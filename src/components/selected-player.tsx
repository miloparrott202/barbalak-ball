"use client";

import type { Player } from "@/lib/types";

interface SelectedPlayerProps {
  player: Player | undefined;
  label?: string;
}

export function SelectedPlayer({ player, label }: SelectedPlayerProps) {
  if (!player) return null;

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      {label && (
        <p className="text-xs tracking-widest uppercase text-zinc-400">{label}</p>
      )}
      <div className="flex items-center gap-3">
        {player.icon_id ? (
          <img
            src={`/balls/${player.icon_id}`}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-300"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-600 ring-2 ring-emerald-300">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-lg font-bold text-zinc-900">{player.name}</span>
      </div>
    </div>
  );
}
