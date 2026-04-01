"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, UserPlus, ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlayerList, type Player } from "@/components/player-list";
import { QRDisplay } from "@/components/qr-display";
import { CopyLink } from "@/components/copy-link";
import { AddPhilDialog } from "@/components/add-phil-dialog";

export default function HostLobbyPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [philOpen, setPhilOpen] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${shortCode}`
      : "";

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
        .select("id, name, icon_id, is_phoneless_phil")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (data) setPlayers(data);
    }
    fetchPlayers();

    const channel = sb
      .channel(`players-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchPlayers();
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  async function handleProceed() {
    if (!gameId) return;
    setProceeding(true);
    await getSupabase()
      .from("games")
      .update({ status: "settings" })
      .eq("id", gameId);
    router.push(`/host/${shortCode}/settings`);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="mb-1 text-sm font-medium text-emerald-600 tracking-wide uppercase">
            Game Lobby
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {shortCode}
          </h1>
        </div>

        {/* QR & Link */}
        <Card>
          <CardContent className="flex flex-col items-center gap-5">
            <QRDisplay url={joinUrl} size={180} />
            <CopyLink url={joinUrl} />
            <p className="text-xs text-zinc-400">
              Scan the QR code or share the link to invite players
            </p>
          </CardContent>
        </Card>

        {/* Player List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-500" />
                <h2 className="text-base font-semibold text-zinc-900">
                  Players ({players.length})
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPhilOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add Phoneless Phil
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PlayerList players={players} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={players.length === 0 || proceeding}
          >
            {proceeding ? "Proceeding\u2026" : "All Players Joined"}
            {!proceeding && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {gameId && (
        <AddPhilDialog
          open={philOpen}
          onClose={() => setPhilOpen(false)}
          gameId={gameId}
        />
      )}
    </main>
  );
}
