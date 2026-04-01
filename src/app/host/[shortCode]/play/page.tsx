"use client";

import { useParams } from "next/navigation";
import { Zap } from "lucide-react";

export default function PlayPage() {
  const { shortCode } = useParams<{ shortCode: string }>();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Zap className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Barbalak-Ball!
        </h1>
        <p className="text-zinc-500">
          Game <span className="font-mono font-semibold">{shortCode}</span> is
          now live.
        </p>
        <p className="text-sm text-zinc-400">
          Game logic will go here. This is a placeholder.
        </p>
      </div>
    </main>
  );
}
