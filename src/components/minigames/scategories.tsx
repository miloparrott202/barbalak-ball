"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import type { Player, CurrentRound } from "@/lib/types";

interface ScategoriesProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

type ScatPhase = "staging" | "think" | "defend" | "result";

export function Scategories({ round, players, currentPlayerId, isHost, gameId, onAdvance }: ScategoriesProps) {
  const { phase: rawPhase, data, selectedPlayerIds } = round;
  const hotSeatId = selectedPlayerIds[0];
  const isHotSeat = currentPlayerId === hotSeatId;
  const hotSeatPlayer = players.find((p) => p.id === hotSeatId);
  const category = data.category as string;
  const letter = data.letter as string;

  const scatPhase = (data.scatPhase as ScatPhase) || (rawPhase === "staging" ? "staging" : rawPhase === "active" ? "think" : "result");

  const [thinkTimer, setThinkTimer] = useState(5);
  const [defendTimer, setDefendTimer] = useState(15);
  const [myVote, setMyVote] = useState<boolean | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);

  useEffect(() => {
    if (scatPhase !== "think") return;
    setThinkTimer(5);
    const interval = setInterval(() => {
      setThinkTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [scatPhase]);

  useEffect(() => {
    if (thinkTimer === 0 && scatPhase === "think" && isHost) {
      onAdvance("active", { scatPhase: "defend" });
    }
  }, [thinkTimer, scatPhase, isHost, onAdvance]);

  useEffect(() => {
    if (scatPhase !== "defend") return;
    setDefendTimer(15);
    const interval = setInterval(() => {
      setDefendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [scatPhase]);

  useEffect(() => {
    if (scatPhase !== "defend" || !gameId) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`scat-votes-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `game_id=eq.${gameId}` },
        async () => {
          const { count } = await sb.from("votes").select("*", { count: "exact", head: true }).eq("game_id", gameId).eq("round_number", data.roundNumber as number);
          setVoteCount(count ?? 0);
        })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [scatPhase, gameId, data.roundNumber]);

  useEffect(() => {
    const voters = players.filter((p) => p.id !== hotSeatId);
    setTotalVoters(voters.length);
  }, [players, hotSeatId]);

  useEffect(() => {
    if (defendTimer === 0 && scatPhase === "defend" && isHost) {
      handleTallyVotes();
    }
    if (voteCount >= totalVoters && totalVoters > 0 && scatPhase === "defend" && isHost) {
      handleTallyVotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defendTimer, voteCount, totalVoters, scatPhase, isHost]);

  const handleVote = useCallback(async (approve: boolean) => {
    if (myVote !== null) return;
    setMyVote(approve);
    const sb = getSupabase();
    await sb.from("votes").insert({
      game_id: gameId,
      player_id: currentPlayerId,
      round_number: data.roundNumber as number,
      vote: approve,
    });
  }, [myVote, gameId, currentPlayerId, data.roundNumber]);

  const handleTallyVotes = useCallback(async () => {
    const sb = getSupabase();
    const { data: votes } = await sb.from("votes")
      .select("vote")
      .eq("game_id", gameId)
      .eq("round_number", data.roundNumber as number);

    const yesVotes = (votes ?? []).filter((v: { vote: boolean }) => v.vote).length;
    const totalCast = (votes ?? []).length;
    const nonVoters = totalVoters - totalCast;
    const noVotes = (totalCast - yesVotes) + nonVoters;
    const accepted = yesVotes >= noVotes;

    onAdvance("result", { accepted, yesVotes, noVotes: noVotes });
  }, [gameId, data.roundNumber, totalVoters, onAdvance]);

  if (rawPhase === "staging" && scatPhase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Scategories</h2>
        <SelectedPlayer player={hotSeatPlayer} label="On the Hot Seat" />
        <div className="flex items-center gap-4 mt-2">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-6 py-4 text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Category</p>
            <p className="text-lg font-bold text-zinc-900">{category}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-6 py-4 text-center">
            <p className="text-xs text-emerald-500 uppercase tracking-wider">Letter</p>
            <p className="text-3xl font-black text-emerald-700">{letter}</p>
          </div>
        </div>
        {isHost && (
          <Button onClick={() => onAdvance("active", { scatPhase: "think" })} className="mt-6">
            Start Round
          </Button>
        )}
      </div>
    );
  }

  if (scatPhase === "think") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-xs tracking-widest uppercase text-zinc-400 mb-2">Think Fast!</p>
        <div className={cn(
          "text-8xl font-black tabular-nums mb-6 transition-all",
          thinkTimer <= 2 ? "text-red-500 scale-110" : "text-zinc-900",
        )}>
          {thinkTimer}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-zinc-500">{category}</span>
          <span className="text-xl font-black text-emerald-600">{letter}</span>
        </div>
        <p className="text-sm text-zinc-400">
          {isHotSeat ? "Think of a word — don't say it yet!" : `${hotSeatPlayer?.name} is thinking...`}
        </p>
      </div>
    );
  }

  if (scatPhase === "defend") {
    const isVoter = !isHotSeat && currentPlayerId !== "";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-xs tracking-widest uppercase text-amber-500 mb-2">Defend Your Answer!</p>
        <div className={cn(
          "text-5xl font-black tabular-nums mb-4",
          defendTimer <= 5 ? "text-red-500" : "text-zinc-900",
        )}>
          {defendTimer}
        </div>
        <SelectedPlayer player={hotSeatPlayer} label="Defending" />
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-zinc-500">{category}</span>
          <span className="text-xl font-black text-emerald-600">{letter}</span>
        </div>

        {isVoter && myVote === null && (
          <div className="flex gap-4">
            <Button onClick={() => handleVote(true)} className="px-8 py-4 text-lg">
              👍 Accept
            </Button>
            <Button variant="danger" onClick={() => handleVote(false)} className="px-8 py-4 text-lg">
              👎 Reject
            </Button>
          </div>
        )}

        {isVoter && myVote !== null && (
          <p className="text-emerald-600 font-semibold">Vote cast!</p>
        )}

        {isHotSeat && (
          <p className="text-zinc-400 text-sm">Defend your answer out loud!</p>
        )}

        <p className="text-xs text-zinc-400 mt-4">{voteCount} / {totalVoters} voted</p>
      </div>
    );
  }

  if (rawPhase === "result") {
    const accepted = data.accepted as boolean;
    const yesVotes = (data.yesVotes as number) ?? 0;
    const noVotes = (data.noVotes as number) ?? 0;

    return (
      <div className="flex flex-col items-center justify-center px-4 text-center py-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Scategories</h2>
        <SelectedPlayer player={hotSeatPlayer} />
        <p className="text-sm text-zinc-400 mb-2">
          Category: {category} | Letter: {letter}
        </p>

        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{yesVotes}</p>
            <p className="text-xs text-zinc-400">Accept</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{noVotes}</p>
            <p className="text-xs text-zinc-400">Reject</p>
          </div>
        </div>

        <p className={cn("font-semibold text-lg", accepted ? "text-emerald-600" : "text-red-500")}>
          {accepted ? `Accepted! +5 pts to ${hotSeatPlayer?.name}` : `Rejected! -5 pts for ${hotSeatPlayer?.name}`}
        </p>
      </div>
    );
  }

  return null;
}
