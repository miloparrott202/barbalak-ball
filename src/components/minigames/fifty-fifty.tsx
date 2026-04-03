"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import { MinigameDescriptionPopup } from "@/components/minigame-description";
import { Info } from "lucide-react";
import type { Player, CurrentRound } from "@/lib/types";

interface FiftyFiftyProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

const TYPE_OPTIONS = ["PENALTY", "REWARD"];

const RARITY_SEGMENTS = [
  { label: "Common", weight: 50, color: "#a1a1aa" },
  { label: "Uncommon", weight: 35, color: "#22c55e" },
  { label: "Rare", weight: 20, color: "#a855f7" },
  { label: "Legendary", weight: 5, color: "#f59e0b" },
];

function SlotReel({ items, finalValue, duration, onDone, className }: {
  items: string[];
  finalValue: string;
  duration: number;
  onDone: () => void;
  className?: string;
}) {
  const [display, setDisplay] = useState(items[0]);
  const [spinning, setSpinning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % items.length;
      setDisplay(items[idx]);
    }, 80);

    const timer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(finalValue);
      setSpinning(false);
      setTimeout(onDone, 500);
    }, duration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timer);
    };
  }, [items, finalValue, duration, onDone]);

  return (
    <div className={cn(
      "text-4xl font-black uppercase tracking-wider transition-all duration-300 rounded-xl border-2 border-yellow-400 bg-zinc-900 text-white px-8 py-4 shadow-lg",
      spinning ? "blur-[2px] scale-105" : "blur-0 scale-100",
      className,
    )}>
      {display}
    </div>
  );
}

function PlayerSlotReel({ players, finalPlayer, onDone }: {
  players: Player[];
  finalPlayer: Player;
  onDone: () => void;
}) {
  const [display, setDisplay] = useState(players[0]);
  const [spinning, setSpinning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % players.length;
      setDisplay(players[idx]);
    }, 120);

    const timer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(finalPlayer);
      setSpinning(false);
      setTimeout(onDone, 600);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timer);
    };
  }, [players, finalPlayer, onDone]);

  return (
    <div className={cn(
      "flex flex-col items-center gap-2 transition-all duration-300 rounded-2xl border-2 border-yellow-400 bg-zinc-900 px-10 py-6 shadow-xl",
      spinning ? "blur-[1px] scale-105" : "blur-0 scale-100",
    )}>
      {display.icon_id ? (
        <img src={`/balls/${display.icon_id}`} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-yellow-400" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-white ring-2 ring-yellow-400">
          {display.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xl font-black text-white">{display.name}</span>
    </div>
  );
}

const RARITY_GLOW: Record<string, string> = {
  common: "rgba(161,161,170,0.3)",
  uncommon: "rgba(34,197,94,0.4)",
  rare: "rgba(168,85,247,0.5)",
  legendary: "rgba(245,158,11,0.6)",
};

function RarityWheel({ finalValue, onDone }: { finalValue: string; onDone: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const isLegendary = finalValue === "legendary";
  const isRare = finalValue === "rare";
  const isUncommon = finalValue === "uncommon";

  useEffect(() => {
    const totalWeight = RARITY_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    const targetIdx = RARITY_SEGMENTS.findIndex(
      (s) => s.label.toLowerCase() === finalValue.toLowerCase(),
    );
    let cumulativeDeg = 0;
    for (let i = 0; i < targetIdx; i++) {
      cumulativeDeg += (RARITY_SEGMENTS[i].weight / totalWeight) * 360;
    }
    const segDeg = (RARITY_SEGMENTS[targetIdx].weight / totalWeight) * 360;
    const targetDeg = cumulativeDeg + segDeg / 2;
    const spins = isLegendary ? 12 : isRare ? 10 : 7;
    const dur = isLegendary ? 5000 : isRare ? 3800 : 2800;
    const finalRot = 360 * spins + ((270 - targetDeg + 360) % 360);

    requestAnimationFrame(() => setRotation(finalRot));

    const timer = setTimeout(() => {
      setDone(true);
      const revealDelay = isLegendary ? 1200 : isRare ? 800 : 400;
      setTimeout(() => onDoneRef.current(), revealDelay);
    }, dur);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalValue]);

  const spinDuration = isLegendary ? "5s" : isRare ? "3.5s" : "2.5s";

  const totalWeight = RARITY_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let startAngle = 0;
  const paths = RARITY_SEGMENTS.map((seg) => {
    const angle = (seg.weight / totalWeight) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const r = 120;
    const cx = 140, cy = 140;
    const x1 = cx + r * Math.cos((Math.PI / 180) * startAngle);
    const y1 = cy + r * Math.sin((Math.PI / 180) * startAngle);
    const x2 = cx + r * Math.cos((Math.PI / 180) * endAngle);
    const y2 = cy + r * Math.sin((Math.PI / 180) * endAngle);
    const labelAngle = startAngle + angle / 2;
    const lx = cx + 70 * Math.cos((Math.PI / 180) * labelAngle);
    const ly = cy + 70 * Math.sin((Math.PI / 180) * labelAngle);
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    startAngle = endAngle;
    return { d, color: seg.color, label: seg.label, lx, ly, labelAngle };
  });

  const glowColor = RARITY_GLOW[finalValue] ?? RARITY_GLOW.common;

  return (
    <div className="relative w-[75vw] max-w-[320px] aspect-square mx-auto">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-yellow-400 text-3xl drop-shadow-lg">▼</div>

      {done && (
        <div
          className="absolute inset-[-20px] rounded-full pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            animation: isLegendary
              ? "rarityPulseGold 0.8s ease-in-out infinite alternate"
              : isRare
                ? "rarityPulsePurple 1s ease-in-out infinite alternate"
                : "none",
          }}
        />
      )}

      <svg
        viewBox="0 0 280 280"
        className="w-full h-full drop-shadow-xl relative z-[1]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? `transform ${spinDuration} cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
        }}
      >
        {paths.map((p) => (
          <g key={p.label}>
            <path d={p.d} fill={p.color} stroke="#fbbf24" strokeWidth="2.5" />
            <text
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              transform={`rotate(${p.labelAngle}, ${p.lx}, ${p.ly})`}
            >
              {p.label}
            </text>
          </g>
        ))}
        <circle cx="140" cy="140" r="18" fill="#1e293b" stroke="#fbbf24" strokeWidth="2.5" />
        <text x="140" y="140" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="8" fontWeight="bold">
          FATE
        </text>
      </svg>

      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span
            className={cn(
              "text-xl font-black uppercase px-5 py-2 rounded-xl shadow-2xl border-2",
              isLegendary
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-amber-300"
                : isRare
                  ? "bg-gradient-to-r from-purple-600 to-violet-500 text-white border-purple-300"
                  : isUncommon
                    ? "bg-gradient-to-r from-green-500 to-emerald-400 text-white border-green-300"
                    : "bg-white/95 text-zinc-700 border-zinc-300",
            )}
            style={isLegendary ? {
              animation: "rarityShimmer 1.5s linear infinite",
              backgroundSize: "200% 100%",
            } : undefined}
          >
            {finalValue}
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes rarityPulseGold {
          from { opacity: 0.5; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1.08); }
        }
        @keyframes rarityPulsePurple {
          from { opacity: 0.4; transform: scale(0.97); }
          to { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes rarityShimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function FiftyFifty({ round, players, currentPlayerId, isHost, onAdvance }: FiftyFiftyProps) {
  const { phase, data, selectedPlayerIds } = round;
  const selectedId = selectedPlayerIds[0];
  const selectedPlayer = players.find((p) => p.id === selectedId);
  const type = data.type as string;
  const rarity = data.rarity as string;
  const action = data.action as string;

  const [revealStep, setRevealStep] = useState(0);
  const [legendaryFlash, setLegendaryFlash] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleFlip = useCallback(() => {
    onAdvance("active");
  }, [onAdvance]);

  const handlePlayerRevealed = useCallback(() => {
    setRevealStep(2);
  }, []);

  const handleTypeRevealed = useCallback(() => {
    setRevealStep(3);
  }, []);

  const handleRarityRevealed = useCallback(() => {
    setRevealStep(4);
    if (rarity === "legendary") {
      setLegendaryFlash(true);
      setShaking(true);
      setTimeout(() => setLegendaryFlash(false), 2500);
      setTimeout(() => setShaking(false), 2000);
    } else if (rarity === "rare") {
      setShaking(true);
      setTimeout(() => setShaking(false), 800);
    }
    setTimeout(() => {
      onAdvance("result");
    }, rarity === "legendary" ? 3000 : rarity === "rare" ? 1800 : 600);
  }, [rarity, onAdvance]);

  useEffect(() => {
    if (phase === "active" && revealStep === 0) {
      setRevealStep(1);
    }
  }, [phase, revealStep]);

  const [showRulesPopup, setShowRulesPopup] = useState(false);

  if (phase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-zinc-900">50 / 50</h2>
          <button onClick={() => setShowRulesPopup(true)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
        {showRulesPopup && (
          <MinigameDescriptionPopup minigame="fifty-fifty" onClose={() => setShowRulesPopup(false)} />
        )}
        <p className="text-sm text-zinc-400 mt-2 mb-6">Could be good, could be bad. Who knows&hellip;</p>
        {(isHost) && (
          <Button onClick={handleFlip} className="mt-2" size="lg">
            Flip the Coin
          </Button>
        )}
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] px-4 text-center relative",
        shaking && "animate-shake",
      )}>
        {legendaryFlash && (
          <div className="fixed inset-0 pointer-events-none z-50" style={{
            background: "radial-gradient(circle at center, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.15) 40%, transparent 70%)",
            animation: "legendaryScreenPulse 0.6s ease-in-out infinite alternate",
          }} />
        )}
        {rarity === "rare" && shaking && (
          <div className="fixed inset-0 pointer-events-none z-50" style={{
            background: "radial-gradient(circle at center, rgba(168,85,247,0.2) 0%, transparent 60%)",
          }} />
        )}

        <div className="mb-8 w-full max-w-md">
          <p className="text-xs tracking-widest uppercase text-zinc-400 mb-6">Revealing...</p>

          {revealStep === 1 && (
            <div className="mb-6">
              <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wider">Who&apos;s it gonna be?</p>
              <PlayerSlotReel
                players={players}
                finalPlayer={selectedPlayer!}
                onDone={handlePlayerRevealed}
              />
            </div>
          )}

          {revealStep === 2 && (
            <div className="mb-6">
              <SelectedPlayer player={selectedPlayer} />
              <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wider">Penalty or Reward?</p>
              <div className="flex justify-center">
                <SlotReel
                  items={TYPE_OPTIONS}
                  finalValue={type === "reward" ? "REWARD" : "PENALTY"}
                  duration={1500}
                  onDone={handleTypeRevealed}
                />
              </div>
            </div>
          )}

          {revealStep === 3 && (
            <div className="mb-6">
              <SelectedPlayer player={selectedPlayer} />
              <div className={cn(
                "text-2xl font-black uppercase mb-4",
                type === "penalty" ? "text-red-500" : "text-emerald-500",
              )}>
                {type === "reward" ? "REWARD" : "PENALTY"}
              </div>
              <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">Rarity</p>
              <RarityWheel
                finalValue={rarity}
                onDone={handleRarityRevealed}
              />
            </div>
          )}

          {revealStep >= 4 && (
            <div className="mb-6 relative">
              <SelectedPlayer player={selectedPlayer} />
              <div className={cn(
                "text-2xl font-black uppercase mb-2",
                type === "penalty" ? "text-red-500" : "text-emerald-500",
              )}>
                {type === "reward" ? "REWARD" : "PENALTY"}
              </div>
              <div
                className={cn(
                  "text-2xl font-black uppercase mb-4 inline-block px-5 py-1.5 rounded-lg",
                  rarity === "legendary"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-300/50"
                    : rarity === "rare"
                      ? "bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-300/40"
                      : rarity === "uncommon"
                        ? "bg-green-500 text-white"
                        : "bg-zinc-200 text-zinc-600",
                )}
                style={rarity === "legendary" ? {
                  animation: "legendaryBadgePulse 1s ease-in-out infinite alternate",
                } : undefined}
              >
                {rarity.toUpperCase()}
              </div>
              <style jsx>{`
                @keyframes legendaryBadgePulse {
                  from { transform: scale(1); box-shadow: 0 0 15px rgba(245,158,11,0.4); }
                  to { transform: scale(1.05); box-shadow: 0 0 30px rgba(245,158,11,0.7); }
                }
                @keyframes legendaryScreenPulse {
                  from { opacity: 0.4; }
                  to { opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center px-4 text-center py-8 relative",
        rarity === "legendary" && "animate-pulse-slow",
      )}>
        {rarity === "legendary" && (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 to-transparent pointer-events-none rounded-3xl" />
        )}
        {rarity === "rare" && (
          <div className="absolute inset-0 bg-gradient-to-b from-purple-100/20 to-transparent pointer-events-none rounded-3xl" />
        )}

        <SelectedPlayer player={selectedPlayer} />

        <span
          className={cn(
            "rounded-full px-4 py-1 text-sm font-bold uppercase tracking-wider mb-3",
            type === "penalty"
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600",
          )}
        >
          {type === "reward" ? "reward" : "penalty"}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-0.5 text-xs font-medium uppercase tracking-wider mb-6",
            rarity === "legendary"
              ? "bg-amber-100 text-amber-600 ring-2 ring-amber-300"
              : rarity === "rare"
                ? "bg-purple-50 text-purple-600"
                : rarity === "uncommon"
                  ? "bg-green-50 text-green-600"
                  : "bg-zinc-100 text-zinc-500",
          )}
        >
          {rarity}
        </span>
        <div className={cn(
          "rounded-xl px-8 py-6 max-w-sm border",
          rarity === "legendary" ? "bg-amber-50 border-amber-300 shadow-lg shadow-amber-100" :
          rarity === "rare" ? "bg-purple-50 border-purple-200" :
          rarity === "uncommon" ? "bg-green-50 border-green-200" :
          "bg-zinc-50 border-zinc-200",
        )}>
          <p className={cn(
            "text-lg font-semibold",
            rarity === "legendary" ? "text-amber-900" : "text-zinc-900",
          )}>{action}</p>
        </div>
        <p className="text-sm text-zinc-400 mt-4">
          {selectedPlayer?.name} must comply.
        </p>
      </div>
    );
  }

  return null;
}
