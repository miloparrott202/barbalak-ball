"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@/lib/content";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import { MinigameDescriptionPopup } from "@/components/minigame-description";
import type { Player, CurrentRound, TriviaQuestion } from "@/lib/types";
import { Info } from "lucide-react";

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

const DIFFICULTY_WHEEL_SEGMENTS = [
  { label: "Easy", weight: 30, color: "#22c55e" },
  { label: "Medium", weight: 30, color: "#f59e0b" },
  { label: "Hard", weight: 30, color: "#ef4444" },
  { label: "Ruinous", weight: 10, color: "#18181b" },
];

function DifficultyWheel({
  targetDifficulty,
  onDone,
}: {
  targetDifficulty: string;
  onDone: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const segments = DIFFICULTY_WHEEL_SEGMENTS;
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    const targetIdx = segments.findIndex(
      (s) => s.label.toLowerCase() === targetDifficulty.toLowerCase(),
    );
    if (targetIdx < 0) return;
    let cumDeg = 0;
    for (let i = 0; i < targetIdx; i++) {
      cumDeg += (segments[i].weight / totalWeight) * 360;
    }
    const segDeg = (segments[targetIdx].weight / totalWeight) * 360;
    const targetDeg = cumDeg + segDeg / 2;
    const finalRot = 360 * 8 + ((270 - targetDeg + 360) % 360);

    requestAnimationFrame(() => {
      setRotation(finalRot);
    });

    const timer = setTimeout(() => {
      setLanded(true);
      setTimeout(() => onDoneRef.current(), 600);
    }, 4200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDifficulty]);

  const totalWeight = DIFFICULTY_WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let startAngle = 0;
  const paths = DIFFICULTY_WHEEL_SEGMENTS.map((seg) => {
    const angle = (seg.weight / totalWeight) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const r = 130;
    const cx = 150, cy = 150;
    const x1 = cx + r * Math.cos((Math.PI / 180) * startAngle);
    const y1 = cy + r * Math.sin((Math.PI / 180) * startAngle);
    const x2 = cx + r * Math.cos((Math.PI / 180) * endAngle);
    const y2 = cy + r * Math.sin((Math.PI / 180) * endAngle);
    const labelAngle = startAngle + angle / 2;
    const lx = cx + 80 * Math.cos((Math.PI / 180) * labelAngle);
    const ly = cy + 80 * Math.sin((Math.PI / 180) * labelAngle);
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    startAngle = endAngle;
    return { d, color: seg.color, label: seg.label, lx, ly, labelAngle };
  });

  return (
    <div className="relative w-[80vw] max-w-[340px] aspect-square mx-auto my-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-yellow-400 text-3xl drop-shadow-lg">
        ▼
      </div>
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full drop-shadow-xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        }}
      >
        {paths.map((p) => (
          <g key={p.label}>
            <path d={p.d} fill={p.color} stroke="#fbbf24" strokeWidth="2" />
            <text
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="16"
              fontWeight="bold"
              transform={`rotate(${p.labelAngle}, ${p.lx}, ${p.ly})`}
            >
              {p.label}
            </text>
          </g>
        ))}
        <circle cx="150" cy="150" r="20" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
      </svg>
      {landed && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/95 rounded-xl px-5 py-2 shadow-2xl border-2 border-yellow-400 text-center">
            <p className="text-xl font-black text-zinc-900 capitalize">{targetDifficulty}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const remoteAnswer = data[`q${currentQ}_answered`] as boolean | undefined;
  const remoteCorrect = data[`q${currentQ}_correct`] as boolean | undefined;
  const remoteOption = data[`q${currentQ}_option`] as number | undefined;

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
  const [showDifficultyWheel, setShowDifficultyWheel] = useState(false);
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (remoteAnswer && !answered) {
      setAnswered(true);
      if (remoteOption !== undefined) setSelected(remoteOption);
      if (remoteCorrect === false && Math.random() < 0.1) setRoastMsg(true);
    }
  }, [remoteAnswer, remoteCorrect, remoteOption, answered]);

  useEffect(() => {
    if (!question) return;
    const mapped = question.options.map((text, i) => ({ text, originalIdx: i }));
    setShuffledOptions(shuffleArray(mapped));
    setAnswered(false);
    setSelected(null);
    setTimer(15);
    setRoastMsg(false);

    setShowDifficultyWheel(true);
  }, [question]);

  const handleDifficultyWheelDone = useCallback(() => {
    if (!question) return;
    setShowDifficultyWheel(false);

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
    if (phase !== "active" || showDifficultyWheel) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [phase, currentQ, showDifficultyWheel]);

  useEffect(() => {
    if (answered && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = undefined;
      setTimer(0);
    }
  }, [answered]);

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

      onAdvance("active", {
        [`q${currentQ}_answered`]: true,
        [`q${currentQ}_correct`]: isCorrect,
        [`q${currentQ}_option`]: optionOriginalIdx,
      });
    },
    [answered, question, gameId, currentPlayerId, currentQ, onAdvance],
  );

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-zinc-900">Trivia</h2>
          <button onClick={() => setShowRulesPopup(true)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
        {showRulesPopup && (
          <MinigameDescriptionPopup
            name="Trivia"
            description="A difficulty wheel spins for each question. The selected player must answer before time runs out. +10 pts for correct, -5 pts for incorrect. Correct answers let you make someone drink!"
            onClose={() => setShowRulesPopup(false)}
          />
        )}
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
    if (showDifficultyWheel) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-zinc-400 mb-2">Spinning for difficulty...</p>
          <SelectedPlayer player={selectedPlayer} label="Up Next" />
          <DifficultyWheel
            targetDifficulty={question.difficulty}
            onDone={handleDifficultyWheelDone}
          />
        </div>
      );
    }

    const showResult = answered || timer === 0;
    const isCorrect = selected !== null ? selected === question.answer : (remoteCorrect ?? false);

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
                const isRemoteSelected = remoteOption === opt.originalIdx;
                return (
                  <div
                    key={opt.originalIdx}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm font-medium",
                      showResult && isCorrectAnswer && "border-emerald-500 bg-emerald-50 text-emerald-700",
                      showResult && isRemoteSelected && !isCorrectAnswer && "border-red-500 bg-red-50 text-red-700",
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
                const qCorrect = remoteAnswer ? (remoteCorrect ?? false) : isCorrect;
                const newScores = [
                  ...resultScores,
                  { playerId: selectedId, correct: qCorrect, roast: roastMsg },
                ];
                setResultScores(newScores);

                if (currentQ + 1 < totalQuestions) {
                  onAdvance("active", {
                    currentQ: currentQ + 1,
                    resultScores: newScores,
                  });
                  setTimer(15);
                  setAnswered(false);
                  setSelected(null);
                } else {
                  onAdvance("result", {
                    resultScores: newScores,
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
