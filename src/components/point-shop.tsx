"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { shopItems } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { X, ChevronRight } from "lucide-react";

interface PointShopProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  allPlayers: Player[];
  gameId: string;
}

export function PointShop({ open, onClose, player, allPlayers, gameId }: PointShopProps) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const targets = allPlayers.filter((p) => p.id !== player.id);

  async function purchase(itemId: string, targetId: string | null) {
    const item = shopItems.find((i) => i.id === itemId);
    if (!item) return;
    setBusy(true);
    try {
      const sb = getSupabase();
      const { data: fresh } = await sb.from("players").select("score").eq("id", player.id).single();
      const currentScore = fresh?.score ?? player.score;
      if (currentScore < item.cost) return;
      await sb.from("purchases").insert({
        game_id: gameId,
        buyer_id: player.id,
        target_id: targetId,
        item_id: itemId,
        cost: item.cost,
      });
      await sb
        .from("players")
        .update({ score: currentScore - item.cost })
        .eq("id", player.id);
      setSelecting(null);
      onClose();
    } catch (err) {
      console.error("Purchase failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-zinc-900">Point Shop</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-amber-600">
              ★ {player.score} pts
            </span>
            <button
              onClick={() => { setSelecting(null); onClose(); }}
              className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selecting ? (
            <div>
              <button
                onClick={() => setSelecting(null)}
                className="text-sm text-zinc-500 hover:text-zinc-700 mb-3"
              >
                ← Back
              </button>
              <p className="text-sm text-zinc-600 mb-3">Choose a target:</p>
              <div className="space-y-2">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    disabled={busy}
                    onClick={() => purchase(selecting, t.id)}
                    className="w-full flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium text-zinc-800">{t.name}</span>
                    <span className="text-sm text-zinc-400">{t.score} pts</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            shopItems.map((item) => {
              const canAfford = player.score >= item.cost;
              return (
                <button
                  key={item.id}
                  disabled={!canAfford || busy}
                  onClick={() => {
                    if (item.requiresTarget) {
                      setSelecting(item.id);
                    } else {
                      purchase(item.id, null);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    canAfford
                      ? "border-zinc-200 hover:bg-zinc-50"
                      : "border-zinc-100 opacity-40 cursor-not-allowed",
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        {item.name}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {item.cost} pts
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-300 flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
