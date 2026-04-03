"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SelectedPlayer } from "@/components/selected-player";
import { MinigameDescriptionPopup } from "@/components/minigame-description";
import type { Player, CurrentRound } from "@/lib/types";
import { Info } from "lucide-react";

interface ScategoriesProps {
  round: CurrentRound;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  gameId: string;
  onAdvance: (phase: string, extraData?: Record<string, unknown>) => void;
}

type ScatPhase = "staging" | "think" | "defend" | "wheel" | "result";

const SUCCESS_WHEEL = [
  { label: "Make someone else shotgun", weight: 10, points: 0, color: "#ef4444" },
  { label: "+10 points", weight: 40, points: 10, color: "#22c55e" },
  { label: "Hand out a handle pull", weight: 20, points: 0, color: "#f59e0b" },
  { label: "Make someone else finish their drink", weight: 10, points: 0, color: "#8b5cf6" },
  { label: "+15 points", weight: 20, points: 15, color: "#06b6d4" },
];

const DEFEAT_WHEEL = [
  { label: "Shotgun", weight: 10, points: 0, color: "#ef4444" },
  { label: "-10 points", weight: 40, points: -10, color: "#64748b" },
  { label: "Handle pull", weight: 20, points: 0, color: "#f59e0b" },
  { label: "Finish their drink", weight: 10, points: 0, color: "#8b5cf6" },
  { label: "-15 points", weight: 20, points: -15, color: "#1e293b" },
];

function pickWeighted(items: typeof SUCCESS_WHEEL): (typeof SUCCESS_WHEEL)[number] {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function WheelOfFate({
  segments,
  finalLabel,
  onDone,
}: {
  segments: typeof SUCCESS_WHEEL;
  finalLabel: string;
  onDone: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    const targetIdx = segments.findIndex((s) => s.label === finalLabel);
    if (targetIdx < 0) return;
    let cumDeg = 0;
    for (let i = 0; i < targetIdx; i++) {
      cumDeg += (segments[i].weight / totalWeight) * 360;
    }
    const segDeg = (segments[targetIdx].weight / totalWeight) * 360;
    const targetDeg = cumDeg + segDeg / 2;
    const finalRot = 360 * 10 + ((270 - targetDeg + 360) % 360);

    requestAnimationFrame(() => {
      setRotation(finalRot);
    });

    const timer = setTimeout(() => {
      setLanded(true);
      setTimeout(() => onDoneRef.current(), 800);
    }, 7200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, finalLabel]);

  const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
  let startAngle = 0;
  const paths = segments.map((seg) => {
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
    const lx = cx + 85 * Math.cos((Math.PI / 180) * labelAngle);
    const ly = cy + 85 * Math.sin((Math.PI / 180) * labelAngle);
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    startAngle = endAngle;
    return { d, color: seg.color, label: seg.label, lx, ly, labelAngle };
  });

  return (
    <div className="relative w-[90vw] max-w-[400px] aspect-square mx-auto my-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-yellow-400 text-4xl drop-shadow-lg">
        ▼
      </div>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
          boxShadow: "0 0 60px 20px rgba(251,191,36,0.15)",
        }}
      />
      <svg
        viewBox="0 0 320 320"
        className="w-full h-full drop-shadow-xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? "transform 7s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        }}
      >
        {paths.map((p) => (
          <g key={p.label}>
            <path d={p.d} fill={p.color} stroke="#fbbf24" strokeWidth="3" />
            <text
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="13"
              fontWeight="bold"
              transform={`rotate(${p.labelAngle}, ${p.lx}, ${p.ly})`}
            >
              {p.label.length > 20 ? p.label.slice(0, 18) + "…" : p.label}
            </text>
          </g>
        ))}
        <circle cx="160" cy="160" r="22" fill="#1e293b" stroke="#fbbf24" strokeWidth="3" />
        <text x="160" y="160" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="12" fontWeight="bold">
          FATE
        </text>
      </svg>
      {landed && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/95 rounded-xl px-6 py-4 shadow-2xl border-2 border-yellow-400 max-w-[280px] text-center">
            <p className="text-lg font-black text-zinc-900">{finalLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [votedPlayerIds, setVotedPlayerIds] = useState<string[]>([]);
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const defendTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tallyCalledRef = useRef(false);

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
    tallyCalledRef.current = false;
    setDefendTimer(15);
    const interval = setInterval(() => {
      setDefendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    defendTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [scatPhase]);

  useEffect(() => {
    if (scatPhase !== "defend" || !gameId) return;
    const sb = getSupabase();
    const roundNum = data.roundNumber as number;

    async function fetchVotes() {
      const { data: voteRows, error } = await sb
        .from("votes")
        .select("voter_id")
        .eq("game_id", gameId)
        .eq("round_id", String(roundNum));
      if (error) return;
      const ids = (voteRows ?? []).map((v: { voter_id: string }) => v.voter_id);
      setVotedPlayerIds(ids);
      setVoteCount(ids.length);
    }

    fetchVotes();

    const channel = sb
      .channel(`scat-votes-${gameId}-${roundNum}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes", filter: `game_id=eq.${gameId}` },
        () => { fetchVotes(); },
      )
      .subscribe();

    const pollInterval = setInterval(fetchVotes, 500);

    return () => {
      sb.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [scatPhase, gameId, data.roundNumber]);

  useEffect(() => {
    const voters = players.filter((p) => p.id !== hotSeatId);
    setTotalVoters(voters.length);
  }, [players, hotSeatId]);

  const doTally = useCallback(async () => {
    if (tallyCalledRef.current) return;
    tallyCalledRef.current = true;
    if (defendTimerRef.current) {
      clearInterval(defendTimerRef.current);
      defendTimerRef.current = undefined;
    }
    setDefendTimer(0);

    const sb = getSupabase();
    const roundNum = data.roundNumber as number;

    await new Promise((r) => setTimeout(r, 1500));

    const { data: votes } = await sb.from("votes")
      .select("vote")
      .eq("game_id", gameId)
      .eq("round_id", String(roundNum));

    const yesVotes = (votes ?? []).filter((v: { vote: boolean }) => v.vote).length;
    const totalCast = (votes ?? []).length;
    const nonVoters = totalVoters - totalCast;
    const noVotes = (totalCast - yesVotes) + nonVoters;
    const accepted = yesVotes >= noVotes;

    const wheel = accepted ? SUCCESS_WHEEL : DEFEAT_WHEEL;
    const outcome = pickWeighted(wheel);

    onAdvance("active", {
      scatPhase: "wheel",
      accepted,
      yesVotes,
      noVotes,
      wheelOutcome: outcome.label,
      wheelPoints: outcome.points,
    });
  }, [gameId, data.roundNumber, totalVoters, onAdvance]);

  useEffect(() => {
    if (scatPhase !== "defend" || !isHost) return;
    if (tallyCalledRef.current) return;

    const allVoted = voteCount >= totalVoters && totalVoters > 0;
    const timedOut = defendTimer === 0;

    if (allVoted || timedOut) {
      doTally();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defendTimer, voteCount, totalVoters, scatPhase, isHost]);

  const handleVote = useCallback(async (approve: boolean) => {
    if (myVote !== null) return;
    setMyVote(approve);
    const sb = getSupabase();
    const { error } = await sb.from("votes").insert({
      game_id: gameId,
      voter_id: currentPlayerId,
      round_id: String(data.roundNumber as number),
      vote: approve,
    });
    if (error) {
      console.error("Vote insert failed:", error);
      setMyVote(null);
    }
  }, [myVote, gameId, currentPlayerId, data.roundNumber]);

  const notVotedPlayers = useMemo(() => {
    return players.filter((p) => p.id !== hotSeatId && !votedPlayerIds.includes(p.id));
  }, [players, hotSeatId, votedPlayerIds]);

  if (rawPhase === "staging" && scatPhase === "staging") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-zinc-900">Scategories</h2>
          <button onClick={() => setShowRulesPopup(true)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
        {showRulesPopup && (
          <MinigameDescriptionPopup
            name="Scategories"
            description="A letter and category are revealed. The hot-seat player must quickly say a word that starts with that letter and fits the category. Everyone else votes to accept or reject. A Wheel of Fate decides your reward or punishment!"
            onClose={() => setShowRulesPopup(false)}
          />
        )}
        <SelectedPlayer player={hotSeatPlayer} label="On the Hot Seat" />
        <p className="text-sm text-zinc-400 mt-2">Letter and category will appear when {hotSeatPlayer?.name} hits Play</p>
        {isHotSeat && (
          <Button onClick={() => onAdvance("active", { scatPhase: "think" })} className="mt-6">
            Play
          </Button>
        )}
        {!isHotSeat && (
          <p className="text-sm text-zinc-400 mt-4">Waiting for {hotSeatPlayer?.name} to start...</p>
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
          {isHotSeat ? "Say it as soon as you've got one!" : `${hotSeatPlayer?.name} is thinking...`}
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
          <div className="flex gap-6">
            <button
              onClick={() => handleVote(true)}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-6 py-4 hover:bg-emerald-100 transition-colors active:scale-95"
            >
              <img src="/images/yes.png" alt="Yes" className="w-14 h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="text-sm font-bold text-emerald-700">Accept</span>
            </button>
            <button
              onClick={() => handleVote(false)}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-red-300 bg-red-50 px-6 py-4 hover:bg-red-100 transition-colors active:scale-95"
            >
              <img src="/images/no.png" alt="No" className="w-14 h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="text-sm font-bold text-red-700">Reject</span>
            </button>
          </div>
        )}

        {isVoter && myVote !== null && (
          <p className="text-emerald-600 font-semibold">Vote cast!</p>
        )}

        <p className="text-xs text-zinc-400 mt-4">{voteCount} / {totalVoters} voted</p>

        {notVotedPlayers.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-zinc-400 mb-1">Waiting on:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {notVotedPlayers.map((p) => (
                <span key={p.id} className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (scatPhase === "wheel") {
    const accepted = data.accepted as boolean;
    const wheelOutcome = data.wheelOutcome as string;
    const segments = accepted ? SUCCESS_WHEEL : DEFEAT_WHEEL;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-1">
          {hotSeatPlayer?.name} must now spin the Wheel of Fate
        </h2>
        <p className={cn("text-sm font-semibold mb-2", accepted ? "text-emerald-600" : "text-red-500")}>
          {accepted ? "The crowd accepts!" : "The crowd rejects!"}
        </p>
        <WheelOfFate
          segments={segments}
          finalLabel={wheelOutcome}
          onDone={() => {
            if (isHost) {
              onAdvance("active", {
                scatPhase: "result",
                wheelOutcome: data.wheelOutcome,
                wheelPoints: data.wheelPoints,
                accepted: data.accepted,
                yesVotes: data.yesVotes,
                noVotes: data.noVotes,
              });
            }
          }}
        />
      </div>
    );
  }

  if (scatPhase === "result") {
    const accepted = data.accepted as boolean;
    const yesVotes = (data.yesVotes as number) ?? 0;
    const noVotes = (data.noVotes as number) ?? 0;
    const wheelOutcome = data.wheelOutcome as string;

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

        <p className={cn("font-bold text-xl mb-2", accepted ? "text-emerald-600" : "text-red-500")}>
          {accepted ? "Accepted!" : "Rejected!"}
        </p>
        {wheelOutcome && (
          <div className={cn(
            "rounded-xl px-6 py-3 border font-semibold text-lg",
            accepted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700",
          )}>
            {wheelOutcome}
          </div>
        )}
      </div>
    );
  }

  return null;
}
