"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  selectNextMinigame,
  selectPlayers,
  buildCharadesRound,
  buildTriviaRound,
  buildScategoriesRound,
  buildFiftyFiftyRound,
  rollInterRoundEvent,
  updateGameRound,
  addScore,
  markContentUsed,
  getUsedContent,
  executePendingPurchases,
} from "@/lib/game-engine";
import { shopItems } from "@/lib/content";

import type { Game, Player, CurrentRound, TriviaQuestion } from "@/lib/types";

import { Pause, Play, SkipForward, UserX, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hud, BullshitOverlay } from "@/components/hud";
import { Scoreboard } from "@/components/scoreboard";
import { Transition } from "@/components/transition";
import { FloatingBalls } from "@/components/floating-balls";
import { Charades } from "@/components/minigames/charades";
import { Trivia } from "@/components/minigames/trivia";
import { Scategories } from "@/components/minigames/scategories";
import { FiftyFifty } from "@/components/minigames/fifty-fifty";
import { WorldEventCard } from "@/components/events/world-event";
import { FunFactCard } from "@/components/events/fun-fact";
import { SpecialWorldEventCard } from "@/components/events/special-world-event";

export default function HostPlayPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostPlayerId, setHostPlayerId] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);
  const [roundBusy, setRoundBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [customPhrases, setCustomPhrases] = useState<string[]>([]);
  const [collectingPhrases, setCollectingPhrases] = useState(false);
  const [hostPhrase1, setHostPhrase1] = useState("");
  const [hostPhrase2, setHostPhrase2] = useState("");
  const [hostPhrasesSubmitted, setHostPhrasesSubmitted] = useState(false);
  const [kickMenuOpen, setKickMenuOpen] = useState(false);
  const [correctPtsOpen, setCorrectPtsOpen] = useState(false);
  const [correctPtsPlayer, setCorrectPtsPlayer] = useState<string>("");
  const [correctPtsAmount, setCorrectPtsAmount] = useState("");
  const notifTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triviaScoredRef = useRef(false);

  const gameRef = useRef<Game | null>(null);
  const playersRef = useRef<Player[]>([]);
  const customPhrasesRef = useRef<string[]>([]);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { customPhrasesRef.current = customPhrases; }, [customPhrases]);

  useEffect(() => {
    if (!collectingPhrases || !game?.id) return;
    const sb = getSupabase();
    const interval = setInterval(async () => {
      const { data: fresh } = await sb.from("games").select("*").eq("id", game.id).single();
      if (fresh) setGame(fresh as Game);
    }, 2000);
    return () => clearInterval(interval);
  }, [collectingPhrases, game?.id]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let gameChannel: ReturnType<typeof sb.channel> | null = null;
    let playerChannel: ReturnType<typeof sb.channel> | null = null;

    async function init() {
      const { data: g } = await sb
        .from("games")
        .select("*")
        .eq("short_code", shortCode)
        .single();
      if (!g) { router.push("/"); return; }
      setGame(g as Game);

      const { data: p } = await sb
        .from("players")
        .select("*")
        .eq("game_id", g.id)
        .order("created_at", { ascending: true });
      if (p) {
        setPlayers(p as Player[]);
        const host = (p as Player[]).find((pl) => pl.is_host);
        if (host) setHostPlayerId(host.id);
      }

      gameChannel = sb
        .channel(`host-game-${g.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${g.id}` },
          (payload) => setGame(payload.new as Game))
        .subscribe();

      playerChannel = sb
        .channel(`host-players-${g.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${g.id}` },
          async () => {
            const { data: fresh } = await sb.from("players").select("*").eq("game_id", g.id).order("created_at", { ascending: true });
            if (fresh) setPlayers(fresh as Player[]);
          })
        .subscribe();

      const enabledIds = g.enabled_categories ?? [];
      if (enabledIds.includes("charades-custom") && !g.current_round) {
        await updateGameRound(g.id, {
          minigame: "charades",
          phase: "scoreboard",
          selectedPlayerIds: [],
          data: { collectingPhrases: true },
          startedAt: new Date().toISOString(),
        });
        setCollectingPhrases(true);
      } else if (!g.current_round) {
        await updateGameRound(g.id, { minigame: "charades", phase: "scoreboard", selectedPlayerIds: [], data: {}, startedAt: new Date().toISOString() });
      }
    }

    init();

    return () => {
      if (gameChannel) sb.removeChannel(gameChannel);
      if (playerChannel) sb.removeChannel(playerChannel);
    };
  }, [shortCode, router]);

  const startMinigame = useCallback(async () => {
    const g = gameRef.current;
    const pl = playersRef.current;
    if (!g || pl.length === 0) return;

    const enabledIds = g.enabled_categories ?? [];
    const mg = selectNextMinigame(enabledIds);
    let round: CurrentRound;

    switch (mg) {
      case "charades": {
        const used = await getUsedContent(g.id, "charades");
        const p = selectPlayers(pl, 1)[0];
        const useDefault = enabledIds.includes("charades-default");
        round = buildCharadesRound(p, used, customPhrasesRef.current, useDefault);
        break;
      }
      case "trivia": {
        const used = await getUsedContent(g.id, "trivia");
        round = buildTriviaRound(pl, used);
        break;
      }
      case "scategories": {
        const used = await getUsedContent(g.id, "scategories");
        const p = selectPlayers(pl, 1)[0];
        round = buildScategoriesRound(p, used);
        break;
      }
      case "fifty-fifty": {
        round = buildFiftyFiftyRound(pl);
        break;
      }
    }

    const newRoundNum = g.round_number + 1;
    round.data.roundNumber = newRoundNum;
    triviaScoredRef.current = false;
    await getSupabase().from("games").update({ round_number: newRoundNum }).eq("id", g.id);
    await updateGameRound(g.id, round);
  }, []);

  const startNextRound = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;
    setRoundBusy(true);

    const executed = await executePendingPurchases(g.id);
    if (executed.length > 0) {
      const pl = playersRef.current;
      const msgs = executed.map((e) => {
        const buyer = pl.find((p) => p.id === e.buyer);
        const item = shopItems.find((i) => i.id === e.item);
        const target = e.target ? pl.find((p) => p.id === e.target) : null;
        return target
          ? `${buyer?.name ?? "?"} used ${item?.name ?? "?"} on ${target.name}`
          : `${buyer?.name ?? "?"} used ${item?.name ?? "?"}`;
      });
      showNotification(msgs.join(" / "));
    }

    const enabledIds = g.enabled_categories ?? [];
    const usedWE = await getUsedContent(g.id, "world-event");
    const usedFF = await getUsedContent(g.id, "fun-fact");
    const usedSWE = await getUsedContent(g.id, "special-world-event");
    const event = rollInterRoundEvent(enabledIds, usedWE, usedFF, usedSWE);

    if (event) {
      await markContentUsed(g.id, event.type, event.id);

      if (event.type === "special-world-event") {
        const pl = playersRef.current;
        const targetPlayer = pl[Math.floor(Math.random() * pl.length)];
        await updateGameRound(g.id, {
          minigame: g.current_round?.minigame ?? "charades",
          phase: "event",
          selectedPlayerIds: [],
          data: {
            eventType: "special-world-event",
            eventId: event.id,
            sweTitle: event.title,
            sweDescription: event.description,
            sweTargetImage: event.targetImage,
            sweTargetPlayerId: targetPlayer.id,
          },
          startedAt: new Date().toISOString(),
        });
        setRoundBusy(false);
        return;
      }

      await updateGameRound(g.id, {
        minigame: g.current_round?.minigame ?? "charades",
        phase: "event",
        selectedPlayerIds: [],
        data: {
          eventType: event.type,
          eventText: event.type === "world-event" || event.type === "fun-fact" ? event.text : "",
          eventId: event.id,
        },
        startedAt: new Date().toISOString(),
      });
      setRoundBusy(false);
      return;
    }

    await startMinigame();
    setRoundBusy(false);
  }, [showNotification, startMinigame]);

  const handleAdvance = useCallback(
    async (phase: string, extraData?: Record<string, unknown>) => {
      const g = gameRef.current;
      if (!g?.current_round) return;
      const r = g.current_round;
      const updatedData: Record<string, unknown> = extraData ? { ...r.data, ...extraData } : { ...r.data };

      if (r.minigame === "charades" && phase === "result") {
        const success = extraData?.success ?? updatedData.success;
        const actorId = r.selectedPlayerIds[0];
        if (success) {
          await addScore(actorId, 10);
        } else {
          await addScore(actorId, -10);
        }
        await markContentUsed(g.id, "charades", r.data.phraseId as string);
      }

      if (r.minigame === "trivia" && phase === "result" && !triviaScoredRef.current) {
        triviaScoredRef.current = true;
        const scores = (extraData?.resultScores ?? updatedData.resultScores) as
          { playerId: string; correct: boolean }[] | undefined;
        if (scores) {
          for (const s of scores) {
            if (s.correct) {
              await addScore(s.playerId, 10);
            } else {
              await addScore(s.playerId, -5);
            }
          }
          const questions = (r.data.questions ?? []) as { question: TriviaQuestion }[];
          for (const q of questions) {
            await markContentUsed(g.id, "trivia", q.question.id);
          }
          updatedData.triviaScored = true;
        }
      }

      if (r.minigame === "scategories" && updatedData.scatPhase === "result" && !r.data.scatScored) {
        const pts = updatedData.wheelPoints as number;
        if (pts !== 0) {
          await addScore(r.selectedPlayerIds[0], pts);
        }
        await markContentUsed(g.id, "scategories", r.data.categoryId as string);
        updatedData.scatScored = true;
      }

      await updateGameRound(g.id, { ...r, phase: phase as CurrentRound["phase"], data: updatedData });
    },
    [],
  );

  const handlePauseToggle = useCallback(async () => {
    const g = gameRef.current;
    if (!g?.current_round) return;
    const newPaused = !paused;
    setPaused(newPaused);
    await updateGameRound(g.id, { ...g.current_round, data: { ...g.current_round.data, paused: newPaused } });
  }, [paused]);

  const handleSkip = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;
    setPaused(false);
    await updateGameRound(g.id, {
      minigame: g.current_round?.minigame ?? "charades",
      phase: "scoreboard",
      selectedPlayerIds: [],
      data: {},
      startedAt: new Date().toISOString(),
    });
  }, []);

  const handleKickPlayer = useCallback(async (playerId: string) => {
    const g = gameRef.current;
    if (!g) return;
    const sb = getSupabase();
    await sb.from("players").update({ score: 0 }).eq("id", playerId);
    await sb.from("players").delete().eq("id", playerId);
    setKickMenuOpen(false);
    const { data: fresh } = await sb.from("players").select("*").eq("game_id", g.id).order("created_at", { ascending: true });
    if (fresh) setPlayers(fresh as Player[]);
    showNotification("Player removed");
  }, [showNotification]);

  const handleCorrectPoints = useCallback(async () => {
    if (!correctPtsPlayer || !correctPtsAmount) return;
    const amount = parseInt(correctPtsAmount, 10);
    if (isNaN(amount)) return;
    await addScore(correctPtsPlayer, amount);
    const g = gameRef.current;
    if (g) {
      const sb = getSupabase();
      const { data: fresh } = await sb.from("players").select("*").eq("game_id", g.id).order("created_at", { ascending: true });
      if (fresh) setPlayers(fresh as Player[]);
    }
    const p = playersRef.current.find((pl) => pl.id === correctPtsPlayer);
    showNotification(`${amount >= 0 ? "+" : ""}${amount} pts to ${p?.name ?? "?"}`);
    setCorrectPtsOpen(false);
    setCorrectPtsPlayer("");
    setCorrectPtsAmount("");
  }, [correctPtsPlayer, correctPtsAmount, showNotification]);

  const handleDismissBullshit = useCallback(async () => {
    const g = gameRef.current;
    if (!g?.current_round) return;
    const newData = { ...g.current_round.data };
    delete newData.bullshitActive;
    delete newData.bullshitCaller;
    delete newData.bullshitCallerName;
    newData.paused = false;
    setPaused(false);
    await updateGameRound(g.id, { ...g.current_round, data: newData });
  }, []);

  const handleTransitionDone = useCallback(() => {
    handleAdvance("staging");
  }, [handleAdvance]);

  const handleEventDismiss = useCallback(async () => {
    await startMinigame();
  }, [startMinigame]);

  const handleRoundEnd = useCallback(async () => {
    const g = gameRef.current;
    if (!g) return;
    const sb = getSupabase();
    const { data: freshPlayers } = await sb
      .from("players")
      .select("*")
      .eq("game_id", g.id)
      .order("created_at", { ascending: true });
    if (freshPlayers) setPlayers(freshPlayers as Player[]);

    const pool = (freshPlayers as Player[]) ?? playersRef.current;
    const leader = [...pool].sort((a, b) => b.score - a.score)[0];
    if (leader && leader.score >= g.point_threshold) {
      await sb.from("games").update({ status: "finished" }).eq("id", g.id);
      await updateGameRound(g.id, {
        minigame: g.current_round?.minigame ?? "charades",
        phase: "result",
        selectedPlayerIds: [],
        data: { winner: leader.id, winnerName: leader.name },
        startedAt: new Date().toISOString(),
      });
      return;
    }
    await updateGameRound(g.id, {
      minigame: g.current_round?.minigame ?? "charades",
      phase: "scoreboard",
      selectedPlayerIds: [],
      data: {},
      startedAt: new Date().toISOString(),
    });
  }, []);

  const hostPlayer = players.find((p) => p.id === hostPlayerId);

  if (!game) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const enabledIds = game.enabled_categories ?? [];
  const devMode = enabledIds.includes("dev-mode");
  const bullshitEnabled = enabledIds.includes("bullshit");
  const bullshitActive = game.current_round?.data?.bullshitActive as boolean;

  if (collectingPhrases) {
    const submittedCount = (game.current_round?.data?.submittedPlayers as string[] ?? []).length;
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Add Your Own Charades</h2>
        <p className="text-sm text-zinc-500 mb-6">Everyone enters 2 phrases on their phone!</p>

        {!hostPhrasesSubmitted ? (
          <div className="w-full max-w-xs space-y-3">
            <Input placeholder="Phrase 1" value={hostPhrase1} onChange={(e) => setHostPhrase1(e.target.value)} />
            <Input placeholder="Phrase 2" value={hostPhrase2} onChange={(e) => setHostPhrase2(e.target.value)} />
            <Button className="w-full" onClick={async () => {
              const phrases = [hostPhrase1.trim(), hostPhrase2.trim()].filter(Boolean);
              if (phrases.length === 0) return;
              setHostPhrasesSubmitted(true);
              const g = gameRef.current;
              if (!g?.current_round) return;
              const existing = (g.current_round.data.customPhrases as string[] ?? []);
              const submitted = (g.current_round.data.submittedPlayers as string[] ?? []);
              await updateGameRound(g.id, {
                ...g.current_round,
                data: {
                  ...g.current_round.data,
                  customPhrases: [...existing, ...phrases],
                  submittedPlayers: [...submitted, hostPlayerId],
                },
              });
            }}>
              Submit Phrases
            </Button>
          </div>
        ) : (
          <p className="text-emerald-600 font-semibold mb-4">Your phrases submitted!</p>
        )}

        <p className="text-xs text-zinc-400 mt-4">{submittedCount} / {players.length} submitted</p>

        {hostPhrasesSubmitted && (
          <Button className="mt-6" onClick={() => {
            const allCustom = (game.current_round?.data?.customPhrases as string[]) ?? [];
            setCustomPhrases(allCustom);
            setCollectingPhrases(false);
          }}>
            Start Game
          </Button>
        )}
      </main>
    );
  }

  if (game.status === "finished") {
    const winnerName = game.current_round?.data?.winnerName as string ?? "Someone";
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-xs tracking-widest uppercase text-amber-500 mb-2">Game Over</p>
        <h1 className="text-4xl font-black text-zinc-900 mb-2">{winnerName} wins!</h1>
        <Scoreboard players={players} pointThreshold={game.point_threshold} />
      </main>
    );
  }

  const letEmFly = enabledIds.includes("let-em-fly");
  const round = game.current_round;

  if (!round || round.phase === "scoreboard") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-14">
        {hostPlayer && <Hud player={hostPlayer} allPlayers={players} gameId={game.id} bullshitEnabled={bullshitEnabled} game={game} />}
        {letEmFly && <FloatingBalls />}
        {notification && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
            {notification}
          </div>
        )}
        <Scoreboard players={players} pointThreshold={game.point_threshold} />
        <button
          onClick={startNextRound}
          disabled={roundBusy}
          className="mt-8 rounded-lg bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {roundBusy ? "Loading\u2026" : "Next Round"}
        </button>
      </main>
    );
  }

  if (round.phase === "event") {
    const eventType = round.data.eventType as string;
    if (eventType === "special-world-event") {
      return (
        <SpecialWorldEventCard
          title={round.data.sweTitle as string}
          description={round.data.sweDescription as string}
          targetImage={round.data.sweTargetImage as string}
          isTarget={hostPlayerId === (round.data.sweTargetPlayerId as string)}
          isHost
          onDismiss={handleEventDismiss}
        />
      );
    }
    const eventText = round.data.eventText as string;
    if (eventType === "world-event") {
      return <WorldEventCard event={eventText} isHost onDismiss={handleEventDismiss} />;
    }
    return (
      <FunFactCard
        text={eventText}
        isHost
        onDismiss={handleEventDismiss}
      />
    );
  }

  if (round.phase === "transition") {
    return <Transition minigame={round.minigame} onComplete={handleTransitionDone} />;
  }

  const minigameProps = {
    round,
    players,
    currentPlayerId: hostPlayerId,
    isHost: true,
    onAdvance: handleAdvance,
  };

  const showHostControls = devMode && ["staging", "active", "result"].includes(round.phase);

  const showContinue = (() => {
    if (round.minigame === "scategories") {
      return round.data.scatPhase === "result";
    }
    return round.phase === "result";
  })();

  const nonHostPlayers = players.filter((p) => !p.is_host);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 relative pt-14">
      {hostPlayer && <Hud player={hostPlayer} allPlayers={players} gameId={game.id} bullshitEnabled={bullshitEnabled} game={game} />}
      {letEmFly && <FloatingBalls />}

      {bullshitActive && (
        <BullshitOverlay
          callerName={round.data.bullshitCallerName as string ?? "Someone"}
          isHost
          onDismiss={handleDismissBullshit}
        />
      )}

      {showHostControls && (
        <div className="fixed top-12 right-3 z-50 flex items-center gap-2">
          <button
            onClick={handlePauseToggle}
            className="flex items-center gap-1 rounded-lg bg-zinc-800 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 transition-colors"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 rounded-lg bg-zinc-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-500 transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </button>
          <div className="relative">
            <button
              onClick={() => setKickMenuOpen(!kickMenuOpen)}
              className="flex items-center gap-1 rounded-lg bg-red-700 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-600 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              Kick
            </button>
            {kickMenuOpen && nonHostPlayers.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-zinc-200 overflow-hidden z-50">
                {nonHostPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleKickPlayer(p.id)}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setCorrectPtsOpen(!correctPtsOpen)}
              className="flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-500 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              Pts
            </button>
            {correctPtsOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-zinc-200 p-3 z-50">
                <select
                  className="w-full mb-2 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                  value={correctPtsPlayer}
                  onChange={(e) => setCorrectPtsPlayer(e.target.value)}
                >
                  <option value="">Select player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Points (+/-)"
                  value={correctPtsAmount}
                  onChange={(e) => setCorrectPtsAmount(e.target.value)}
                  className="mb-2"
                />
                <Button size="sm" className="w-full" onClick={handleCorrectPoints}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {paused && !bullshitActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <h1 className="text-5xl font-black text-white tracking-widest">PAUSED</h1>
        </div>
      )}

      {notification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {notification}
        </div>
      )}

      {round.minigame === "charades" && <Charades {...minigameProps} />}
      {round.minigame === "trivia" && <Trivia {...minigameProps} gameId={game.id} />}
      {round.minigame === "scategories" && <Scategories {...minigameProps} gameId={game.id} />}
      {round.minigame === "fifty-fifty" && <FiftyFifty {...minigameProps} />}

      {showContinue && (
        <button
          onClick={handleRoundEnd}
          className="mt-8 rounded-lg bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          Continue
        </button>
      )}
    </main>
  );
}
