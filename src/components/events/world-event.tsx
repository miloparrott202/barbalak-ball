"use client";

import { Button } from "@/components/ui/button";

interface WorldEventProps {
  event: string;
  isHost: boolean;
  onDismiss: () => void;
}

export function WorldEventCard({ event, isHost, onDismiss }: WorldEventProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <p className="text-xs tracking-widest uppercase text-amber-500 mb-2">
        World Event
      </p>
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-8 py-6 max-w-sm mb-6">
        <p className="text-lg font-semibold text-zinc-900">{event}</p>
      </div>
      <p className="text-sm text-zinc-400 mb-4">Do it. Now.</p>
      {isHost && (
        <Button onClick={onDismiss}>Continue</Button>
      )}
    </div>
  );
}
