"use client";

import { cn } from "@/lib/utils";

const BALL_COUNT = 10;
const BALLS = Array.from({ length: BALL_COUNT }, (_, i) => `ball-${i + 1}.png`);

interface IconPickerProps {
  selected: string;
  onSelect: (iconId: string) => void;
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {BALLS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={cn(
            "rounded-xl border-2 p-1 transition-all",
            selected === id
              ? "border-emerald-500 bg-emerald-50 scale-110"
              : "border-zinc-200 hover:border-zinc-400",
          )}
        >
          <img
            src={`/balls/${id}`}
            alt={id}
            className="w-full aspect-square rounded-lg object-cover"
          />
        </button>
      ))}
    </div>
  );
}

export { BALLS };
