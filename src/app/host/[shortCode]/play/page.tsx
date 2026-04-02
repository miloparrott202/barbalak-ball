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
  rollWorldEvent,
  rollFunFact,
  updateGameRound,
  addScore,
  markContentUsed,
  getUsedContent,
  executePendingPurchases,
  tallyTriviaScores,
} from "@/lib/game-engine";
import { shopItems } from "@/lib/content";
import type { Game, Player, CurrentRound } from "@/lib/types";

import { Scoreboard } from "@/components/scoreboard";
import { Transition } from "@/components/transition";
import { Charades } from "@/components/minigames/charades";
import { Trivia } from "@/components/minigames/trivia";
import { Scategories } from "@/components/minigames/scategories";
import { FiftyFifty } from "@/components/minigames/fifty-fifty";
import { WorldEventCard } from "@/components/events/world-event";
import { FunFactCard } from "@/components/events/fun-fact";

export default function HostPlayPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [roundBusy, setRoundBusy] = useState(false);
  const notifTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const gameRef = useRef<Game | null>(null);
  const playersRef = useRef<Player[]>([]);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playersRef.current = players; }, [players]);

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
      if (p) setPlayers(p as Player[]);

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

      if (!g.current_round) {
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
        round = buildCharadesRound(p, used);
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
        const p = selectPlayers(pl, 1)[0];
        round = buildFiftyFiftyRound(p);
        break;
      }
    }

    await getSupabase().from("games").update({ round_number: g.round_number + 1 }).eq("id", g.id);
    await updateGameRound(g.id, round);
  }, []);

  const startNextRound = useCallback(async () => {
    const g = gameRef.current;
    const pl = playersRef.current;
    if (!g) return;
    setRoundBusy(true);

    const executed = await executePendingPurchases(g.id);
    if (executed.length > 0) {
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

    if (enabledIds.includes("fun-facts")) {
      const usedFF = await getUsedContent(g.id, "fun-fact");
      const ff = rollFunFact(g.round_number, usedFF);
      if (ff) {
        await markContentUsed(g.id, "fun-fact", ff.id);
        await updateGameRound(g.id, {
          minigame: g.current_round?.minigame ?? "charades",
          phase: "event",
          selectedPlayerIds: [],
          data: { eventType: "fun-fact", eventText: ff.text, eventId: ff.id },
          startedAt: new Date().toISOString(),
        });
        setRoundBusy(false);
        return;
      }
    }

    if (enabledIds.includes("world-events")) {
      const usedWE = await getUsedContent(g.id, "world-event");
      const we = rollWorldEvent(usedWE);
      if (we) {
        await markContentUsed(g.id, "world-event", we.id);
        await updateGameRound(g.id, {
          minigame: g.current_round?.minigame ?? "charades",
          phase: "event",
          selectedPlayerIds: [],
          data: { eventType: "world-event", eventText: we.event, eventId: we.id },
          startedAt: new Date().toISOString(),
        });
        setRoundBusy(false);
        return;
      }
    }

    await startMinigame();
    setRoundBusy(false);
  }, [showNotification, startMinigame]);

  const handleAdvance = useCallback(
    async (phase: string, extraData?: Record<string, unknown>) => {
      const g = gameRef.current;
      if (!g?.current_round) return;
      const r = g.current_round;
      const updatedData = extraData ? { ...r.data, ...extraData } : r.data;

      if (phase === "result") {
        if (r.minigame === "charades" && extraData?.success) {
          await addScore(r.selectedPlayerIds[0], 5);
          await markContentUsed(g.id, "charades", r.data.phraseId as string);
        }
        if (r.minigame === "trivia" && r.phase !== "result") {
          await tallyTriviaScores(g.id, r);
        }
        if (r.minigame === "scategories" && extraData?.accepted && r.data.accepted === undefined) {
          await addScore(r.selectedPlayerIds[0], 5);
          await markContentUsed(g.id, "scategories", r.data.categoryId as string);
        }
      }

      if (r.minigame === "trivia" && phase === "active" && extraData?.currentQuestion !== undefined) {
        await updateGameRound(g.id, {
          ...r,
          phase: "active" as const,
          data: { ...r.data, currentQuestion: extraData.currentQuestion },
        });
        return;
      }

      await updateGameRound(g.id, { ...r, phase: phase as CurrentRound["phase"], data: updatedData });
    },
    [],
  );

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

  if (!game) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
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

  const round = game.current_round;

  if (!round || round.phase === "scoreboard") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
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
    currentPlayerId: "",
    isHost: true,
    onAdvance: handleAdvance,
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 relative">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {notification}
        </div>
      )}

      {round.minigame === "charades" && <Charades {...minigameProps} />}
      {round.minigame === "trivia" && <Trivia {...minigameProps} gameId={game.id} />}
      {round.minigame === "scategories" && <Scategories {...minigameProps} gameId={game.id} />}
      {round.minigame === "fifty-fifty" && <FiftyFifty {...minigameProps} />}

      {round.phase === "result" && (round.minigame !== "scategories" || round.data.accepted !== undefined) && (
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
