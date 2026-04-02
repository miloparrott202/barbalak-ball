"use client";

import { X } from "lucide-react";
import type { MinigameType } from "@/lib/types";
import { categories } from "@/lib/content";

const MINIGAME_DESCRIPTIONS: Record<MinigameType, string> = {
  charades: categories.find((c) => c.id === "charades")?.description ?? "",
  trivia: categories.find((c) => c.id === "trivia")?.description ?? "",
  scategories: categories.find((c) => c.id === "scategories")?.description ?? "",
  "fifty-fifty": categories.find((c) => c.id === "fifty-fifty")?.description ?? "",
};

type MinigameDescriptionPopupProps =
  | { minigame: MinigameType; onClose: () => void; name?: never; description?: never }
  | { name: string; description: string; onClose: () => void; minigame?: never };

export function MinigameDescriptionPopup(props: MinigameDescriptionPopupProps) {
  const { onClose } = props;
  const description = props.minigame
    ? MINIGAME_DESCRIPTIONS[props.minigame]
    : props.description;

  if (!description) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs tracking-widest uppercase text-emerald-600 mb-1">How to Play</p>
        <p className="text-base text-zinc-700 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface DescriptionListProps {
  onClose: () => void;
}

export function MinigameDescriptionList({ onClose }: DescriptionListProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Minigame Rules</h2>
        <div className="space-y-4">
          {(Object.entries(MINIGAME_DESCRIPTIONS) as [MinigameType, string][]).map(([key, desc]) => (
            <div key={key} className="border-b border-zinc-100 pb-3 last:border-0">
              <p className="text-sm font-semibold text-zinc-900 mb-1 capitalize">
                {key === "fifty-fifty" ? "50 / 50" : key}
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
