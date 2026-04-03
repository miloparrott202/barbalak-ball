"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlayerList } from "@/components/player-list";
import { IconPicker } from "@/components/icon-picker";
import type { Player } from "@/lib/types";
import { QRDisplay } from "@/components/qr-display";
import { CopyLink } from "@/components/copy-link";
import { loadingScreenRules } from "@/lib/content";

export default function HostLobbyPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [proceeding, setProceeding] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  const [hostPlayer, setHostPlayer] = useState<Player | null>(null);
  const [hostName, setHostName] = useState("");
  const [hostIcon, setHostIcon] = useState("ball-1.png");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setJoinUrl(`${base}/join/${shortCode}`);
  }, [shortCode]);

  useEffect(() => {
    async function fetchGame() {
      const { data } = await getSupabase()
        .from("games")
        .select("id")
        .eq("short_code", shortCode)
        .single();
      if (data) setGameId(data.id);
    }
    fetchGame();
  }, [shortCode]);

  useEffect(() => {
    if (!gameId) return;
    const sb = getSupabase();

    async function fetchPlayers() {
      const { data } = await sb
        .from("players")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (data) {
        setPlayers(data as Player[]);
        const existing = (data as Player[]).find((p) => p.is_host);
        if (existing) setHostPlayer(existing);
      }
    }
    fetchPlayers();

    const channel = sb
      .channel(`players-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        () => fetchPlayers(),
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [gameId]);

  async function handleRegisterHost() {
    if (!gameId || !hostName.trim()) return;
    setRegistering(true);
    try {
      const { data, error } = await getSupabase()
        .from("players")
        .insert({ game_id: gameId, name: hostName.trim(), icon_id: hostIcon, is_host: true })
        .select()
        .single();
      if (error) throw error;
      setHostPlayer(data as Player);
    } catch (err) {
      console.error("Failed to register host:", err);
    } finally {
      setRegistering(false);
    }
  }

  async function handleProceed() {
    if (!gameId) return;
    setProceeding(true);
    await getSupabase()
      .from("games")
      .update({ status: "settings" })
      .eq("id", gameId);
    router.push(`/host/${shortCode}/settings`);
  }

  if (!hostPlayer) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-5">
            <div className="text-center">
              <p className="text-sm font-medium text-emerald-600 tracking-wide uppercase">
                Host Setup
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
                {shortCode}
              </h1>
            </div>

            <div>
              <label htmlFor="host-name" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Your Name
              </label>
              <Input
                id="host-name"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRegisterHost(); }}
                autoFocus
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">Pick Your Ball</p>
              <IconPicker selected={hostIcon} onSelect={setHostIcon} />
            </div>

            <Button className="w-full" size="lg" onClick={handleRegisterHost} disabled={!hostName.trim() || registering}>
              {registering ? "Setting up\u2026" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-emerald-600 tracking-wide uppercase">
            Game Lobby
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {shortCode}
          </h1>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">House Rules</p>
          <ol className="list-decimal list-inside space-y-1">
            {loadingScreenRules.map((rule, i) => (
              <li key={i} className="text-sm text-amber-900 leading-snug">{rule}</li>
            ))}
          </ol>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-5">
            <QRDisplay url={joinUrl} size={180} />
            <CopyLink url={joinUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900">
                Players ({players.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <PlayerList players={players} />
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={players.length < 2 || proceeding}
          >
            {proceeding ? "Proceeding\u2026" : "All Players Joined"}
            {!proceeding && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </main>
  );
}
