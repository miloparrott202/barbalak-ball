"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { categories as allCategories, loadingScreenRules } from "@/lib/content";
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
import { SpecialWorldEventCard } from "@/components/events/special-world-event";
import { IconPicker } from "@/components/icon-picker";
import { FloatingBalls } from "@/components/floating-balls";
import { MinigameDescriptionPopup } from "@/components/minigame-description";
import { updateGameRound } from "@/lib/game-engine";
import type { Game, Player, CurrentRound, MinigameType } from "@/lib/types";

const SESSION_KEY_PREFIX = "bb-player-";

function getStoredPlayerId(shortCode: string): string | null {
  try { return localStorage.getItem(`${SESSION_KEY_PREFIX}${shortCode}`); } catch { return null; }
}
function storePlayerId(shortCode: string, playerId: string) {
  try { localStorage.setItem(`${SESSION_KEY_PREFIX}${shortCode}`, playerId); } catch { /* noop */ }
}

export default function JoinPage() {
  const { shortCode } = useParams<{ shortCode: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("ball-1.png");
  const [submitting, setSubmitting] = useState(false);
  const [phrase1, setPhrase1] = useState("");
  const [phrase2, setPhrase2] = useState("");
  const [phrasesSubmitted, setPhrasesSubmitted] = useState(false);
  const [descPopup, setDescPopup] = useState<MinigameType | null>(null);

  const gameRef = useRef<Game | null>(null);
  useEffect(() => { gameRef.current = game; }, [game]);

  const noop = useCallback(() => {}, []);

  const handleAdvance = useCallback(
    async (phase: string, extraData?: Record<string, unknown>) => {
      const g = gameRef.current;
      if (!g?.current_round) return;
      const r = g.current_round;
      const updatedData: Record<string, unknown> = extraData ? { ...r.data, ...extraData } : { ...r.data };
      await updateGameRound(g.id, { ...r, phase: phase as CurrentRound["phase"], data: updatedData });
    },
    [],
  );

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

      if (error || !data) { setNotFound(true); setRestoringSession(false); return; }
      setGame(data as Game);

      const { data: ps } = await sb
        .from("players")
        .select("*")
        .eq("game_id", data.id)
        .order("created_at", { ascending: true });
      if (ps) setAllPlayers(ps as Player[]);

      const storedId = getStoredPlayerId(shortCode);
      if (storedId && ps) {
        const existing = (ps as Player[]).find((p) => p.id === storedId);
        if (existing) {
          setMyPlayer(existing);
        }
      }
      setRestoringSession(false);

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
      const player = data as Player;
      setMyPlayer(player);
      storePlayerId(shortCode, player.id);
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

  if (!game || restoringSession) {
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

  const minigames = allCategories.filter((c) => c.type === "minigame" && c.description);

  if (game.status === "lobby" || game.status === "settings") {
    return (
      <main className="flex flex-1 flex-col items-center px-6 text-center pt-6">
        {descPopup && (
          <MinigameDescriptionPopup minigame={descPopup} onClose={() => setDescPopup(null)} />
        )}

        <div className="w-full max-w-xs mb-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">House Rules</p>
            <ol className="list-decimal list-inside space-y-1">
              {loadingScreenRules.map((rule, i) => (
                <li key={i} className="text-sm text-amber-900 leading-snug">{rule}</li>
              ))}
            </ol>
          </div>
        </div>

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

          <div className="mt-6 w-full max-w-xs mx-auto">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Tap to read rules</p>
            <div className="space-y-2">
              {minigames.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setDescPopup(cat.id as MinigameType)}
                  className="w-full flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                  <Info className="h-4 w-4 text-zinc-400" />
                </button>
              ))}
            </div>
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

  useEffect(() => {
    if (round?.data?.collectingPhrases && !phrasesSubmitted) {
      const submitted = (round.data.submittedPlayers as string[] ?? []);
      if (submitted.includes(myPlayer.id)) {
        setPhrasesSubmitted(true);
      }
    }
  }, [round?.data?.collectingPhrases, round?.data?.submittedPlayers, myPlayer.id, phrasesSubmitted]);

  if (round?.data?.collectingPhrases && !phrasesSubmitted) {
    const submitted = (round.data.submittedPlayers as string[] ?? []);
    if (!submitted.includes(myPlayer.id)) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Add Your Charades</h2>
          <p className="text-sm text-zinc-500 mb-6">Enter 2 phrases for charades!</p>
          <div className="w-full max-w-xs space-y-3">
            <Input placeholder="Phrase 1" value={phrase1} onChange={(e) => setPhrase1(e.target.value)} />
            <Input placeholder="Phrase 2" value={phrase2} onChange={(e) => setPhrase2(e.target.value)} />
            <Button className="w-full" onClick={async () => {
              const phrases = [phrase1.trim(), phrase2.trim()].filter(Boolean);
              if (phrases.length === 0) return;
              setPhrasesSubmitted(true);
              const existing = (round.data.customPhrases as string[] ?? []);
              const existingSubmitted = (round.data.submittedPlayers as string[] ?? []);
              await updateGameRound(game.id, {
                ...round,
                data: {
                  ...round.data,
                  customPhrases: [...existing, ...phrases],
                  submittedPlayers: [...existingSubmitted, myPlayer.id],
                },
              });
            }}>
              Submit
            </Button>
          </div>
        </main>
      );
    }
  }

  if (round?.data?.collectingPhrases && phrasesSubmitted) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900">Phrases Submitted!</h2>
        <p className="text-sm text-zinc-400 mt-2">Waiting for everyone else...</p>
      </main>
    );
  }

  const letEmFly = (game.enabled_categories ?? []).includes("let-em-fly");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pt-14">
      {letEmFly && <FloatingBalls />}
      <Hud player={myPlayer} allPlayers={allPlayers} gameId={game.id} />

      {(!round || round.phase === "scoreboard") && (
        <div>
          <Scoreboard players={allPlayers} pointThreshold={game.point_threshold} />
          <p className="text-center text-sm text-zinc-400 mt-4">Waiting for host...</p>
        </div>
      )}

      {round?.phase === "event" && round.data.eventType === "purchases" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-amber-900/90 via-black/80 to-amber-900/90 px-6">
          <p className="text-xs tracking-widest uppercase text-amber-300 mb-4 animate-pulse">Shop Items Activated</p>
          <div className="space-y-4 w-full max-w-sm">
            {((round.data.purchaseItems ?? []) as { buyerName: string; itemName: string; itemDescription: string; targetName: string | null }[]).map((item, i) => (
              <div key={i} className="rounded-2xl border-2 border-amber-400/60 bg-amber-950/60 backdrop-blur px-6 py-5 text-center shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                <p className="text-lg font-black text-amber-300">{item.itemName}</p>
                <p className="text-sm text-amber-100/80 mt-1">{item.itemDescription}</p>
                <p className="text-sm text-white mt-3">
                  <span className="font-bold">{item.buyerName}</span>
                  {item.targetName ? <> used on <span className="font-bold">{item.targetName}</span></> : " activated this"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-amber-300/60">Waiting for host to continue...</p>
        </div>
      )}

      {round?.phase === "event" && round.data.eventType !== "purchases" && (
        round.data.eventType === "special-world-event" ? (
          <SpecialWorldEventCard
            title={round.data.sweTitle as string}
            description={round.data.sweDescription as string}
            targetImage={round.data.sweTargetImage as string}
            isTarget={myPlayer.id === (round.data.sweTargetPlayerId as string)}
            isHost={false}
            onDismiss={noop}
          />
        ) : round.data.eventType === "world-event" ? (
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
            <Charades round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} onAdvance={handleAdvance} />
          )}
          {round.minigame === "trivia" && (
            <Trivia round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} gameId={game.id} onAdvance={handleAdvance} />
          )}
          {round.minigame === "scategories" && (
            <Scategories round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} gameId={game.id} onAdvance={handleAdvance} />
          )}
          {round.minigame === "fifty-fifty" && (
            <FiftyFifty round={round} players={allPlayers} currentPlayerId={myPlayer.id} isHost={false} onAdvance={noop} />
          )}
        </>
      )}
    </main>
  );
}
