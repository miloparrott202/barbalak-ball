"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FunFactProps {
  text: string;
  type: string;
  isHost: boolean;
  onDismiss: () => void;
}

export function FunFactCard({ text, type, isHost, onDismiss }: FunFactProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <p className="text-xs tracking-widest uppercase text-zinc-400 mb-1">
        Fun Fact Intermission
      </p>
      <span
        className={cn(
          "rounded-full px-3 py-0.5 text-xs font-medium uppercase tracking-wider mb-4",
          type === "fact" && "bg-emerald-50 text-emerald-600",
          type === "ridiculous" && "bg-amber-50 text-amber-600",
          type === "escher" && "bg-zinc-200 text-zinc-600",
        )}
      >
        {type === "escher" ? "think about it..." : type}
      </span>
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-8 py-6 max-w-sm mb-6">
        <p className="text-lg font-medium text-zinc-900">&ldquo;{text}&rdquo;</p>
      </div>
      {isHost && (
        <Button onClick={onDismiss}>Continue</Button>
      )}
    </div>
  );
}
