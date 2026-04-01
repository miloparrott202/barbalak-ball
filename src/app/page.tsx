"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { generateShortCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleHost() {
    setLoading(true);
    try {
      const shortCode = generateShortCode();
      const { error } = await getSupabase()
        .from("games")
        .insert({ short_code: shortCode, status: "lobby" });

      if (error) throw error;
      router.push(`/host/${shortCode}`);
    } catch (err) {
      console.error("Failed to create game:", err);
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Barbalak-Ball
          </h1>
        </div>

        <p className="max-w-md text-lg text-zinc-500">
          The real-time party game. One host, many players, zero boredom.
        </p>

        <Button size="lg" onClick={handleHost} disabled={loading}>
          {loading ? "Creating game\u2026" : "Host Barbalak-Ball"}
        </Button>
      </div>
    </main>
  );
}
