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

const WHEEL_SEGMENTS = [
  { label: "Easy", weight: 30, color: "#22c55e", glow: "#4ade80" },
  { label: "Medium", weight: 30, color: "#f59e0b", glow: "#fbbf24" },
  { label: "Hard", weight: 30, color: "#ef4444", glow: "#f87171" },
  { label: "Ruinous", weight: 10, color: "#18181b", glow: "#a855f7" },
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
  const [glowPulse, setGlowPulse] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const totalWeight = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    const targetIdx = WHEEL_SEGMENTS.findIndex(
      (s) => s.label.toLowerCase() === targetDifficulty.toLowerCase(),
    );
    if (targetIdx < 0) return;

    let cumDeg = 0;
    for (let i = 0; i < targetIdx; i++) {
      cumDeg += (WHEEL_SEGMENTS[i].weight / totalWeight) * 360;
    }
    const segDeg = (WHEEL_SEGMENTS[targetIdx].weight / totalWeight) * 360;
    const targetDeg = cumDeg + segDeg / 2;
    const spins = targetDifficulty === "ruinous" ? 12 : 8;
    const finalRot = 360 * spins + ((270 - targetDeg + 360) % 360);
    const duration = targetDifficulty === "ruinous" ? 5500 : 4200;

    requestAnimationFrame(() => setRotation(finalRot));
    const glowTimer = setTimeout(() => setGlowPulse(true), duration * 0.6);

    let innerTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      setLanded(true);
      innerTimer = setTimeout(() => onDoneRef.current(), 800);
    }, duration);
    return () => { clearTimeout(glowTimer); clearTimeout(timer); clearTimeout(innerTimer); };
  }, [targetDifficulty]);

  const totalWeight = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  const landedSeg = WHEEL_SEGMENTS.find(
    (s) => s.label.toLowerCase() === targetDifficulty.toLowerCase(),
  );
  const isRuinous = targetDifficulty === "ruinous";
  const spinDuration = isRuinous ? "5.5s" : "4.2s";

  let startAngle = 0;
  const paths = WHEEL_SEGMENTS.map((seg) => {
    const angle = (seg.weight / totalWeight) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const r = 140;
    const cx = 160, cy = 160;
    const x1 = cx + r * Math.cos((Math.PI / 180) * startAngle);
    const y1 = cy + r * Math.sin((Math.PI / 180) * startAngle);
    const x2 = cx + r * Math.cos((Math.PI / 180) * endAngle);
    const y2 = cy + r * Math.sin((Math.PI / 180) * endAngle);
    const labelAngle = startAngle + angle / 2;
    const lx = cx + 90 * Math.cos((Math.PI / 180) * labelAngle);
    const ly = cy + 90 * Math.sin((Math.PI / 180) * labelAngle);
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    startAngle = endAngle;
    return { d, color: seg.color, glow: seg.glow, label: seg.label, lx, ly, labelAngle };
  });

  return (
    <div className="relative w-[85vw] max-w-[380px] aspect-square mx-auto my-4">
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-40 transition-opacity duration-1000"
        style={{
          background: glowPulse
            ? `radial-gradient(circle, ${landedSeg?.glow ?? "#fbbf24"} 0%, transparent 70%)`
            : "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
        }}
      />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
      </div>

      <svg
        viewBox="0 0 320 320"
        className="w-full h-full drop-shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? `transform ${spinDuration} cubic-bezier(0.15, 0.65, 0.08, 1)` : "none",
          filter: glowPulse ? `drop-shadow(0 0 20px ${landedSeg?.glow ?? "#fbbf24"})` : "none",
        }}
      >
        <defs>
          <filter id="trivia-seg-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="trivia-center-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>

        <circle cx="160" cy="160" r="155" fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.6" />

        {paths.map((p) => (
          <g key={p.label}>
            <path d={p.d} fill={p.color} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <text
              x={p.lx} y={p.ly}
              textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize="18" fontWeight="900"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
              transform={`rotate(${p.labelAngle}, ${p.lx}, ${p.ly})`}
            >
              {p.label}
            </text>
          </g>
        ))}

        <circle cx="160" cy="160" r="24" fill="url(#trivia-center-grad)" stroke="white" strokeWidth="2" />
        <text x="160" y="160" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14" fontWeight="bold">?</text>
      </svg>

      {landed && (
        <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300">
          <div
            className="rounded-2xl px-8 py-4 shadow-2xl border-2 text-center"
            style={{
              background: isRuinous
                ? "linear-gradient(135deg, #18181b, #581c87)"
                : `linear-gradient(135deg, ${landedSeg?.color}, ${landedSeg?.glow})`,
              borderColor: landedSeg?.glow ?? "#fbbf24",
              boxShadow: `0 0 30px ${landedSeg?.glow ?? "#fbbf24"}80`,
            }}
          >
            <p className="text-2xl font-black text-white capitalize tracking-wide" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {targetDifficulty}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes triviaGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

type TriviaSubPhase = "wheel" | "diffImage" | "question";

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

  const [subPhase, setSubPhase] = useState<TriviaSubPhase>("wheel");
  const [timer, setTimer] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<{ text: string; originalIdx: number }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [roastMsg, setRoastMsg] = useState(false);
  const [resultScores, setResultScores] = useState<{ playerId: string; correct: boolean; roast: boolean }[]>(
    (data.resultScores as { playerId: string; correct: boolean; roast: boolean }[]) ?? [],
  );
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const prevQRef = useRef(-1);

  useEffect(() => {
    if (remoteAnswer && !answered) {
      setAnswered(true);
      if (remoteOption !== undefined) setSelected(remoteOption);
      if (remoteCorrect === false && Math.random() < 0.1) setRoastMsg(true);
    }
  }, [remoteAnswer, remoteCorrect, remoteOption, answered]);

  useEffect(() => {
    if (!question || currentQ === prevQRef.current) return;
    prevQRef.current = currentQ;

    const mapped = question.options.map((text, i) => ({ text, originalIdx: i }));
    setShuffledOptions(shuffleArray(mapped));
    setAnswered(false);
    setSelected(null);
    setTimer(15);
    setRoastMsg(false);
    setSubPhase("wheel");
  }, [currentQ, question]);

  const handleWheelDone = useCallback(() => {
    setSubPhase("diffImage");
  }, []);

  useEffect(() => {
    if (subPhase !== "diffImage" || !question) return;

    if (question.difficulty === "ruinous") {
      try {
        const audio = new Audio("/audio/ruinous.mp3");
        audioRef.current = audio;
        audio.play().catch(() => {});
      } catch { /* noop */ }
    }

    const duration = question.difficulty === "ruinous" ? 2500 : 1500;
    const t = setTimeout(() => {
      setSubPhase("question");
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    }, duration);
    return () => {
      clearTimeout(t);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [subPhase, question]);

  useEffect(() => {
    if (phase !== "active" || subPhase !== "question") return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [phase, currentQ, subPhase]);

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
    if (subPhase === "wheel") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-zinc-400 mb-2">Spinning for difficulty...</p>
          <SelectedPlayer player={selectedPlayer} label="Up Next" />
          <DifficultyWheel
            key={`wheel-${currentQ}`}
            targetDifficulty={question.difficulty}
            onDone={handleWheelDone}
          />
        </div>
      );
    }

    if (subPhase === "diffImage") {
      const isRuinous = question.difficulty === "ruinous";
      return (
        <div className={cn(
          "fixed inset-0 z-40 flex items-center justify-center",
          isRuinous ? "bg-black" : "bg-white",
        )}>
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <img
              src={DIFFICULTY_IMAGES[question.difficulty]}
              alt={question.difficulty}
              className="w-[80vw] h-[80vh] object-contain"
            />
            <p
              className={cn(
                "mt-4 text-3xl font-black uppercase tracking-widest",
                isRuinous ? "text-purple-400" : question.difficulty === "hard" ? "text-red-500" : question.difficulty === "medium" ? "text-amber-500" : "text-emerald-500",
              )}
              style={{ textShadow: isRuinous ? "0 0 20px rgba(168,85,247,0.8)" : "none" }}
            >
              {question.difficulty}
            </p>
          </div>
        </div>
      );
    }

    const showResult = answered || timer === 0;
    const isCorrect = selected !== null ? selected === question.answer : (remoteCorrect ?? false);

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 relative">
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
