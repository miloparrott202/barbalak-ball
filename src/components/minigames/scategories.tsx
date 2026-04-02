"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Player, CurrentRound } from "@/lib/types";

interface ScategoriesProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

export function Scategories({ round, players, currentPlayerId, isHost, gameId, onAdvance }: ScategoriesProps) {
  const { phase, data, selectedPlayerIds } = round;
  const hotSeatId = selectedPlayerIds[0];
  const isHotSeat = currentPlayerId === hotSeatId;
  const hotSeatPlayer = players.find((p) => p.id === hotSeatId);
  const category = data.category as string;
  const letter = data.letter as string;

  const [timer, setTimer] = useState(30);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const lockInAnswer = useCallback(async () => {
    if (!answer.trim() || submitted) return;
    setSubmitted(true);
    const sb = getSupabase();
    const { data: g } = await sb.from("games").select("current_round").eq("id", gameId).single();
    if (g?.current_round) {
      await sb.from("games").update({
        current_round: { ...g.current_round, data: { ...g.current_round.data, answer: answer.trim() } },
      }).eq("id", gameId);
    }
  }, [answer, submitted, gameId]);

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Scategories</h2>
        <p className="text-zinc-500 mb-4">
          <span className="font-semibold text-zinc-700">{hotSeatPlayer?.name}</span> is on the hot seat.
        </p>
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
          <Button onClick={() => onAdvance("active")} className="mt-6">
            Start Timer
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active") {
    const answerFromDb = data.answer as string | undefined;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div
          className={cn(
            "text-5xl font-black tabular-nums mb-4",
            timer <= 10 ? "text-red-500" : "text-zinc-900",
          )}
        >
          {timer}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-zinc-500">{category}</span>
          <span className="text-xl font-black text-emerald-600">{letter}</span>
        </div>
        {isHotSeat ? (
          submitted ? (
            <p className="text-emerald-600 font-semibold">Answer locked in!</p>
          ) : (
            <div className="w-full max-w-xs">
              <Input
                placeholder={`Word starting with ${letter}...`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="text-center text-lg"
                autoFocus
              />
              <Button
                onClick={lockInAnswer}
                className="mt-4 w-full"
                disabled={!answer.trim()}
              >
                Lock In Answer
              </Button>
            </div>
          )
        ) : (
          <p className="text-zinc-400 text-sm">
            {answerFromDb
              ? `${hotSeatPlayer?.name} locked in!`
              : `Waiting for ${hotSeatPlayer?.name} to answer...`}
          </p>
        )}
        {isHost && (answerFromDb || timer === 0) && (
          <Button
            onClick={() => onAdvance("result")}
            variant={timer === 0 ? "danger" : "primary"}
            className="mt-4"
          >
            {timer === 0 ? "Time\u2019s Up \u2014 Move to Judging" : "Move to Judging"}
          </Button>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const givenAnswer = (data.answer as string) ?? "(no answer)";
    const decided = data.accepted !== undefined;
    const accepted = data.accepted as boolean;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Scategories</h2>
        <p className="text-zinc-500 mb-4">
          {hotSeatPlayer?.name} answered:
        </p>
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-8 py-4 mb-4">
          <p className="text-2xl font-bold text-zinc-900">&ldquo;{givenAnswer}&rdquo;</p>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Category: {category} | Letter: {letter}
        </p>

        {decided ? (
          <p className={cn("font-semibold text-lg", accepted ? "text-emerald-600" : "text-red-500")}>
            {accepted ? `Accepted! +5 pts to ${hotSeatPlayer?.name}` : `Rejected! ${hotSeatPlayer?.name} drinks!`}
          </p>
        ) : (
          isHost && (
            <div className="flex gap-3">
              <Button
                disabled={deciding}
                onClick={() => { setDeciding(true); onAdvance("result", { accepted: true }); }}
              >
                Accept (+5 pts)
              </Button>
              <Button
                variant="danger"
                disabled={deciding}
                onClick={() => { setDeciding(true); onAdvance("result", { accepted: false }); }}
              >
                Reject (drink!)
              </Button>
            </div>
          )
        )}
      </div>
    );
  }

  return null;
}
