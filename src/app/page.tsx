"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
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
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Barbalak-Ball"
            width={56}
            height={56}
            className="rounded-2xl"
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Barbalak-Ball
          </h1>
        </div>

        <Button size="lg" onClick={handleHost} disabled={loading}>
          {loading ? "Creating game\u2026" : "Host Barbalak-Ball"}
        </Button>
      </div>
    </main>
  );
}
