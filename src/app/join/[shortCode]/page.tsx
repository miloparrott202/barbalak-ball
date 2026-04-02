"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Hud } from "@/components/hud";
import { Scoreboard } from "@/components/scoreboard";
import { Transition } from "@/components/transition";
import { Charades } from "@/components/minigames/charades";
import { Trivia } from "@/components/minigames/trivia";
import { Scategories } from "@/components/minigames/scategories";
import { FiftyFifty } from "@/components/minigames/fifty-fifty";
import { WorldEventCard } from "@/components/events/world-event";
import { FunFactCard } from "@/components/events/fun-fact";
import { IconPicker } from "@/components/icon-picker";
import type { Game, Player } from "@/lib/types";

export default function JoinPage() {
  const { shortCode } = useParams<{ shortCode: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("ball-1.png");
  const [submitting, setSubmitting] = useState(false);

  const noop = useCallback(() => {}, []);

  useEffect(() => {
    const sb = getSupabase();
    let gameCh: ReturnType<typeof sb.channel> | null = null;
    let playerCh: ReturnType<typeof sb.channel> | null = null;

    async function init() {
      const { data, error } = await sb
        .from("games")
        .select("*")
        .eq("short_code", shortCode)
        .single();

      if (error || !data) { setNotFound(true); return; }
      setGame(data as Game);

      const { data: ps } = await sb
        .from("players")
        .select("*")
        .eq("game_id", data.id)
        .order("created_at", { ascending: true });
      if (ps) setAllPlayers(ps as Player[]);

      gameCh = sb
        .channel(`player-game-${data.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${data.id}` },
          (payload) => setGame(payload.new as Game))
        .subscribe();

      playerCh = sb
        .channel(`player-players-${data.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${data.id}` },
          async () => {
            const { data: fresh } = await sb.from("players").select("*").eq("game_id", data.id).order("created_at", { ascending: true });
            if (fresh) setAllPlayers(fresh as Player[]);
          })
        .subscribe();
    }

    init();
    return () => {
      if (gameCh) sb.removeChannel(gameCh);
      if (playerCh) sb.removeChannel(playerCh);
    };
  }, [shortCode]);

  useEffect(() => {
    if (myPlayer) {
      const fresh = allPlayers.find((p) => p.id === myPlayer.id);
      if (fresh) setMyPlayer(fresh);
    }
  }, [allPlayers, myPlayer]);

  async function handleJoin() {
    if (!name.trim() || !game) return;
    setSubmitting(true);
    try {
      const { data, error } = await getSupabase()
        .from("players")
        .insert({ game_id: game.id, name: name.trim(), icon_id: icon })
        .select()
        .single();
      if (error) throw error;
      setMyPlayer(data as Player);
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Game Not Found</h1>
        <p className="mt-2 text-zinc-500">
          No game with code <span className="font-mono font-semibold">{shortCode}</span>.
        </p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!myPlayer) {
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
                onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
                autoFocus
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">Pick Your Ball</p>
              <IconPicker selected={icon} onSelect={setIcon} />
            </div>

            <Button className="w-full" size="lg" onClick={handleJoin} disabled={!name.trim() || submitting}>
              {submitting ? "Joining\u2026" : "Join Game"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (game.status === "lobby" || game.status === "settings") {
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
            <span className="text-sm">
              {game.status === "lobby"
                ? "Waiting for host to start\u2026"
                : "Host is configuring the game\u2026"}
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (game.status === "finished") {
    const winnerName = game.current_round?.data?.winnerName as string ?? "Someone";
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center pt-14">
        <Hud player={myPlayer} allPlayers={allPlayers} gameId={game.id} />
        <p className="text-xs tracking-widest uppercase text-amber-500 mb-2">Game Over</p>
        <h1 className="text-4xl font-black text-zinc-900 mb-2">{winnerName} wins!</h1>
        <Scoreboard players={allPlayers} pointThreshold={game.point_threshold} />
      </main>
    );
  }

  const round = game.current_round;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pt-14">
      <Hud player={myPlayer} allPlayers={allPlayers} gameId={game.id} />

      {(!round || round.phase === "scoreboard") && (
        <div>
          <Scoreboard players={allPlayers} pointThreshold={game.point_threshold} />
          <p className="text-center text-sm text-zinc-400 mt-4">Waiting for host...</p>
        </div>
      )}

      {round?.phase === "event" && (
        round.data.eventType === "world-event" ? (
          <WorldEventCard event={round.data.eventText as string} isHost={false} onDismiss={noop} />
        ) : (
          <FunFactCard
            text={round.data.eventText as string}
            isHost={false}
            onDismiss={noop}
          />
        )
      )}

      {round?.phase === "transition" && (
        <Transition minigame={round.minigame} onComplete={noop} />
      )}

      {round && ["staging", "active", "result"].includes(round.phase) && (
        <>
          {round.minigame === "charades" && (
            <Charades round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} onAdvance={noop} />
          )}
          {round.minigame === "trivia" && (
            <Trivia round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} gameId={game.id} onAdvance={noop} />
          )}
          {round.minigame === "scategories" && (
            <Scategories round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} gameId={game.id} onAdvance={() => {}} />
          )}
          {round.minigame === "fifty-fifty" && (
            <FiftyFifty round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} onAdvance={noop} />
          )}
        </>
      )}
    </main>
  );
}
