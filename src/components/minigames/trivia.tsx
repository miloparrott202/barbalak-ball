"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import type { Player, CurrentRound, TriviaQuestion } from "@/lib/types";

interface TriviaProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

const DIFFICULTY_IMAGES: Record<string, string> = {
  easy: "/images/happy.png",
  medium: "/images/medium.png",
  hard: "/images/hard.png",
  ruinous: "/images/ruinous-trivia.gif",
};

export function Trivia({ round, players, currentPlayerId, isHost, gameId, onAdvance }: TriviaProps) {
  const { phase, data } = round;

  const questions = (data.questions ?? []) as { question: TriviaQuestion; playerId: string }[];
  const currentQ = (data.currentQ as number) ?? 0;
  const totalQuestions = (data.totalQuestions as number) ?? questions.length;
  const currentEntry = questions[currentQ];
  const question = currentEntry?.question;
  const selectedId = currentEntry?.playerId;
  const isSelected = currentPlayerId === selectedId;
  const selectedPlayer = players.find((p) => p.id === selectedId);

  const [timer, setTimer] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<{ text: string; originalIdx: number }[]>([]);
  const [difficultyFlash, setDifficultyFlash] = useState(false);
  const [ruinousFading, setRuinousFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [roastMsg, setRoastMsg] = useState(false);
  const [resultScores, setResultScores] = useState<{ playerId: string; correct: boolean; roast: boolean }[]>(
    (data.resultScores as { playerId: string; correct: boolean; roast: boolean }[]) ?? [],
  );

  useEffect(() => {
    if (!question) return;
    const mapped = question.options.map((text, i) => ({ text, originalIdx: i }));
    setShuffledOptions(shuffleArray(mapped));
    setAnswered(false);
    setSelected(null);
    setTimer(15);
    setRoastMsg(false);

    setDifficultyFlash(true);
    if (question.difficulty === "ruinous") {
      setRuinousFading(true);
      try {
        const audio = new Audio("/audio/ruinous.mp3");
        audioRef.current = audio;
        audio.play().catch(() => {});
      } catch { /* noop */ }
      setTimeout(() => setRuinousFading(false), 2000);
    }
    const flashTimer = setTimeout(() => setDifficultyFlash(false), question.difficulty === "ruinous" ? 2000 : 1200);
    return () => {
      clearTimeout(flashTimer);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
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
  }, [phase, currentQ]);

  const submitAnswer = useCallback(
    async (optionOriginalIdx: number) => {
      if (answered) return;
      setAnswered(true);
      setSelected(optionOriginalIdx);
      const isCorrect = optionOriginalIdx === question.answer;
      if (!isCorrect && Math.random() < 0.1) setRoastMsg(true);
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
        <p className="text-sm text-zinc-500 mb-4">
          {totalQuestions} question{totalQuestions > 1 ? "s" : ""} this round
        </p>
        {isHost && (
          <Button onClick={() => onAdvance("active")} className="mt-4">
            Begin Trivia
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active" && question) {
    const showResult = answered || timer === 0;
    const isCorrect = selected === question.answer;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 relative">
        {difficultyFlash && (
          <div className={cn(
            "fixed inset-0 z-40 flex items-center justify-center pointer-events-none",
            question.difficulty === "ruinous" ? "" : "bg-black/20",
          )}>
            <img
              src={DIFFICULTY_IMAGES[question.difficulty]}
              alt={question.difficulty}
              className={cn(
                "max-w-[200px] max-h-[200px] object-contain",
                question.difficulty === "ruinous" && ruinousFading && "transition-opacity duration-[2000ms] ease-linear",
                question.difficulty === "ruinous" && !ruinousFading && "opacity-0",
              )}
            />
          </div>
        )}

        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400">
              Question {currentQ + 1} / {totalQuestions}
            </p>
            <span
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-bold uppercase",
                question.difficulty === "easy" && "bg-emerald-50 text-emerald-600",
                question.difficulty === "medium" && "bg-amber-50 text-amber-600",
                question.difficulty === "hard" && "bg-red-50 text-red-600",
                question.difficulty === "ruinous" && "bg-zinc-900 text-white",
              )}
            >
              {question.difficulty}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <SelectedPlayer player={selectedPlayer} label="Answering" />
            <div
              className={cn(
                "text-3xl font-black tabular-nums",
                timer <= 5 ? "text-red-500" : "text-zinc-300",
              )}
            >
              {timer}
            </div>
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
              {isCorrect ? (
                <div>
                  <p className="text-emerald-600 font-bold">Correct! +10 pts</p>
                  <p className="text-sm text-amber-600 mt-1">
                    {selectedPlayer?.name} makes someone else drink!
                  </p>
                </div>
              ) : (
                <div>
                  {roastMsg ? (
                    <p className="text-red-500 font-bold">
                      Incorrect, take a drink and lose five points, you dumb fucking sack of shit.
                    </p>
                  ) : (
                    <p className="text-red-500 font-bold">
                      {timer === 0 && !answered ? "Time's up!" : "Incorrect!"} -5 pts. Take a drink.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {isHost && showResult && (
            <div className="mt-6 flex justify-center">
              <Button onClick={() => {
                const newScores = [
                  ...resultScores,
                  { playerId: selectedId, correct: isCorrect, roast: roastMsg },
                ];
                setResultScores(newScores);

                if (currentQ + 1 < totalQuestions) {
                  onAdvance("active", {
                    currentQ: currentQ + 1,
                    resultScores: newScores,
                    [`q${currentQ}_correct`]: isCorrect,
                    [`q${currentQ}_playerId`]: selectedId,
                  });
                  setTimer(15);
                  setAnswered(false);
                  setSelected(null);
                } else {
                  onAdvance("result", {
                    resultScores: newScores,
                    [`q${currentQ}_correct`]: isCorrect,
                    [`q${currentQ}_playerId`]: selectedId,
                  });
                }
              }}>
                {currentQ + 1 < totalQuestions ? "Next Question" : "See Results"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const scores = (data.resultScores as { playerId: string; correct: boolean }[]) ?? [];
    return (
      <div className="flex flex-col items-center justify-center px-4 text-center py-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Trivia Results</h2>
        <div className="space-y-3 w-full max-w-sm">
          {scores.map((s, i) => {
            const p = players.find((pl) => pl.id === s.playerId);
            return (
              <div key={i} className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-2",
                s.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
              )}>
                <span className="text-sm font-medium text-zinc-900">{p?.name ?? "?"}</span>
                <span className={cn("text-sm font-bold", s.correct ? "text-emerald-600" : "text-red-500")}>
                  {s.correct ? "+10 pts" : "-5 pts"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
