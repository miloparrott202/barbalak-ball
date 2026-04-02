"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import type { Player, CurrentRound, TriviaQuestion } from "@/lib/types";

const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 3,
  medium: 6,
  hard: 10,
  ruinous: 20,
};

interface TriviaProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

export function Trivia({ round, players, currentPlayerId, isHost, gameId, onAdvance }: TriviaProps) {
  const { phase, data, selectedPlayerIds } = round;
  const selectedId = selectedPlayerIds[0];
  const isSelected = currentPlayerId === selectedId;
  const selectedPlayer = players.find((p) => p.id === selectedId);

  const question = data.questionData as TriviaQuestion;
  const points = DIFFICULTY_POINTS[question?.difficulty] ?? 0;

  const [timer, setTimer] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<{ text: string; originalIdx: number }[]>([]);

  useEffect(() => {
    if (!question) return;
    const mapped = question.options.map((text, i) => ({ text, originalIdx: i }));
    setShuffledOptions(shuffleArray(mapped));
    setAnswered(false);
    setSelected(null);
    setTimer(15);
  }, [question]);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const submitAnswer = useCallback(
    async (optionOriginalIdx: number) => {
      if (answered) return;
      setAnswered(true);
      setSelected(optionOriginalIdx);
      const isCorrect = optionOriginalIdx === question.answer;
      await getSupabase().from("answers").insert({
        game_id: gameId,
        player_id: currentPlayerId,
        question_id: question.id,
        selected_option: optionOriginalIdx,
        is_correct: isCorrect,
      });
    },
    [answered, question, gameId, currentPlayerId],
  );

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Trivia</h2>
        <SelectedPlayer player={selectedPlayer} label="Answering" />
        <div className="mt-4 mb-6">
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider",
              question?.difficulty === "easy" && "bg-emerald-50 text-emerald-600",
              question?.difficulty === "medium" && "bg-amber-50 text-amber-600",
              question?.difficulty === "hard" && "bg-red-50 text-red-600",
              question?.difficulty === "ruinous" && "bg-zinc-900 text-white",
            )}
          >
            {question?.difficulty}
          </span>
          <p className="text-2xl font-black text-zinc-900 mt-3">{points} points at stake</p>
        </div>
        {isHost && (
          <Button onClick={() => onAdvance("active")} className="mt-4">
            Show Question
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active" && question) {
    const showResult = answered || timer === 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <SelectedPlayer player={selectedPlayer} />
            <div className="text-right">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  question.difficulty === "easy" && "bg-emerald-50 text-emerald-600",
                  question.difficulty === "medium" && "bg-amber-50 text-amber-600",
                  question.difficulty === "hard" && "bg-red-50 text-red-600",
                  question.difficulty === "ruinous" && "bg-zinc-900 text-white",
                )}
              >
                {points} pts
              </span>
            </div>
          </div>

          <div
            className={cn(
              "text-3xl font-black tabular-nums text-right mb-2",
              timer <= 5 ? "text-red-500" : "text-zinc-300",
            )}
          >
            {timer}
          </div>

          <h3 className="text-lg font-semibold text-zinc-900 mb-5">
            {question.question}
          </h3>

          {isSelected ? (
            <div className="grid grid-cols-1 gap-3">
              {shuffledOptions.map((opt) => {
                const isThis = selected === opt.originalIdx;
                const isCorrectAnswer = opt.originalIdx === question.answer;
                return (
                  <button
                    key={opt.originalIdx}
                    disabled={answered || timer === 0}
                    onClick={() => submitAnswer(opt.originalIdx)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                      showResult && isCorrectAnswer && "border-emerald-500 bg-emerald-50 text-emerald-700",
                      showResult && isThis && !isCorrectAnswer && "border-red-500 bg-red-50 text-red-700",
                      !showResult && "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-zinc-800",
                      !showResult && "active:scale-[0.98]",
                    )}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {shuffledOptions.map((opt) => {
                const isCorrectAnswer = opt.originalIdx === question.answer;
                return (
                  <div
                    key={opt.originalIdx}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm font-medium",
                      showResult && isCorrectAnswer && "border-emerald-500 bg-emerald-50 text-emerald-700",
                      !showResult && "border-zinc-200 text-zinc-800",
                    )}
                  >
                    {opt.text}
                  </div>
                );
              })}
            </div>
          )}

          {showResult && (
            <div className="mt-4 text-center">
              {selected === question.answer ? (
                <p className="text-emerald-600 font-bold">Correct! +{points} pts</p>
              ) : (
                <p className="text-red-500 font-bold">
                  {timer === 0 && !answered ? "Time's up!" : "Wrong!"}
                </p>
              )}
            </div>
          )}

          {isHost && showResult && (
            <div className="mt-6 flex justify-center">
              <Button onClick={() => onAdvance("result")}>Continue</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const correct = (data.correct as boolean) ?? false;
    return (
      <div className="flex flex-col items-center justify-center px-4 text-center py-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Trivia</h2>
        <SelectedPlayer player={selectedPlayer} />
        <p className={cn("font-semibold text-lg", correct ? "text-emerald-600" : "text-red-500")}>
          {correct ? `+${points} pts to ${selectedPlayer?.name}!` : `${selectedPlayer?.name} missed it.`}
        </p>
      </div>
    );
  }

  return null;
}
