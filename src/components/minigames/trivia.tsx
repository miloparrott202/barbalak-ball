"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Player, CurrentRound, TriviaQuestion } from "@/lib/types";

interface TriviaProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

export function Trivia({ round, players, currentPlayerId, isHost, gameId, onAdvance }: TriviaProps) {
  const { phase, data } = round;
  const questions = data.questionData as TriviaQuestion[];
  const currentIdx = (data.currentQuestion as number) ?? 0;
  const question = questions[currentIdx];

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
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIdx]);

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
        <p className="text-sm text-zinc-400">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
        {isHost && (
          <Button onClick={() => onAdvance("active")} className="mt-6">
            Start Trivia
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active" && question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-400">
              Q{currentIdx + 1}/{questions.length}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                question.difficulty === "easy" && "bg-emerald-50 text-emerald-600",
                question.difficulty === "medium" && "bg-amber-50 text-amber-600",
                question.difficulty === "hard" && "bg-red-50 text-red-600",
                question.difficulty === "ruinous" && "bg-zinc-900 text-white",
              )}
            >
              {question.difficulty}
            </span>
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

          <div className="grid grid-cols-1 gap-3">
            {shuffledOptions.map((opt) => {
              const isThis = selected === opt.originalIdx;
              const isCorrectAnswer = opt.originalIdx === question.answer;
              const showResult = answered || timer === 0;
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

          {isHost && (
            <div className="mt-6 flex justify-center">
              {currentIdx < questions.length - 1 ? (
                <Button onClick={() => onAdvance("active", { currentQuestion: currentIdx + 1 })}>
                  Next Question
                </Button>
              ) : (
                <Button onClick={() => onAdvance("result")}>See Results</Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Trivia Complete</h2>
        <p className="text-zinc-500">Scores have been tallied!</p>
      </div>
    );
  }

  return null;
}

