"use client";

import { Button } from "@/components/ui/button";

interface FunFactProps {
  text: string;
  isHost: boolean;
  onDismiss: () => void;
}

export function FunFactCard({ text, isHost, onDismiss }: FunFactProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <p className="text-xs tracking-widest uppercase text-zinc-400 mb-4">
        Fun Fact
      </p>
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-8 py-6 max-w-sm mb-6">
        <p className="text-lg font-medium text-zinc-900">&ldquo;{text}&rdquo;</p>
      </div>
      {isHost && (
        <Button onClick={onDismiss}>Continue</Button>
      )}
    </div>
  );
}
