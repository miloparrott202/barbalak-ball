"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { icons } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type GameStatus = "lobby" | "settings" | "playing";

export default function JoinPage() {
  const { shortCode } = useParams<{ shortCode: string }>();

  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("lobby");
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [iconId, setIconId] = useState(icons[0]?.id ?? "icon-1");
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchGame() {
      const { data, error } = await getSupabase()
        .from("games")
        .select("id, status")
        .eq("short_code", shortCode)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setGameId(data.id);
      setGameStatus(data.status);
    }
    fetchGame();
  }, [shortCode]);

  useEffect(() => {
    if (!gameId) return;

    const sb = getSupabase();
    const channel = sb
      .channel(`game-status-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGameStatus(payload.new.status as GameStatus);
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  async function handleJoin() {
    if (!name.trim() || !gameId) return;
    setSubmitting(true);
    try {
      const { error } = await getSupabase().from("players").insert({
        game_id: gameId,
        name: name.trim(),
        icon_id: iconId,
        is_phoneless_phil: false,
      });
      if (error) throw error;
      setJoined(true);
    } catch (err) {
      console.error("Failed to join game:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Game Not Found</h1>
        <p className="mt-2 text-zinc-500">
          No game exists with code <span className="font-mono font-semibold">{shortCode}</span>.
        </p>
      </main>
    );
  }

  if (joined) {
    return <WaitingScreen shortCode={shortCode} gameStatus={gameStatus} />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5">
          <div className="text-center">
            <p className="text-sm font-medium text-emerald-600 tracking-wide uppercase">
              Joining Game
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              {shortCode}
            </h1>
          </div>

          <div>
            <label htmlFor="player-name" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Your Name
            </label>
            <Input
              id="player-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Choose Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setIconId(icon.id)}
                  className={`flex h-12 w-full items-center justify-center rounded-lg border-2 text-xs font-semibold transition-colors ${
                    iconId === icon.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {icon.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={!name.trim() || submitting}
          >
            {submitting ? "Joining\u2026" : "Join Game"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function WaitingScreen({
  shortCode,
  gameStatus,
}: {
  shortCode: string;
  gameStatus: GameStatus;
}) {
  const statusLabel: Record<GameStatus, string> = {
    lobby: "Waiting for host to start\u2026",
    settings: "Host is configuring the game\u2026",
    playing: "Game is starting!",
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-bold text-zinc-900">You&apos;re In!</h1>
        <p className="text-sm text-zinc-500">
          Game <span className="font-mono font-semibold">{shortCode}</span>
        </p>
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{statusLabel[gameStatus]}</span>
        </div>
      </div>
    </main>
  );
}
