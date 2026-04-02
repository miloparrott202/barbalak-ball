import { getSupabase } from "./supabase";
import {
  charades,
  triviaQuestions,
  scategoryCategories,
  scategoryLetters,
  fiftyFifty,
  worldEvents,
  funFacts,
  pickRandom,
  shuffleArray,
  weightedRandom,
} from "./content";
import type {
  CurrentRound,
  MinigameType,
  Player,
  TriviaQuestion,
} from "./types";

const MINIGAMES: MinigameType[] = ["charades", "trivia", "scategories", "fifty-fifty"];

export function getEnabledMinigames(enabledIds: string[]): MinigameType[] {
  const map: Record<string, MinigameType> = {
    charades: "charades",
    trivia: "trivia",
    scategories: "scategories",
    "fifty-fifty": "fifty-fifty",
  };
  const result = enabledIds
    .filter((id) => id in map)
    .map((id) => map[id]);
  return result.length > 0 ? result : MINIGAMES;
}

export function selectNextMinigame(enabledIds: string[]): MinigameType {
  const enabled = getEnabledMinigames(enabledIds);
  return pickRandom(enabled);
}

export function selectPlayers(players: Player[], count: number): Player[] {
  return shuffleArray(players).slice(0, count);
}

export function buildCharadesRound(selectedPlayer: Player, usedIds: string[]): CurrentRound {
  const available = charades.filter((c) => !usedIds.includes(c.id));
  const pool = available.length > 0 ? available : charades;
  const phrase = pickRandom(pool);
  return {
    minigame: "charades",
    phase: "transition",
    selectedPlayerIds: [selectedPlayer.id],
    data: { phraseId: phrase.id, phrase: phrase.phrase, difficulty: phrase.difficulty },
    startedAt: new Date().toISOString(),
  };
}

export function buildTriviaRound(
  players: Player[],
  usedIds: string[],
): CurrentRound {
  const available = triviaQuestions.filter((q) => !usedIds.includes(q.id));
  const source = available.length > 0 ? available : triviaQuestions;

  const numQuestions = Math.max(2, Math.ceil(players.length * 0.5));
  const difficulties = selectTriviadifficulties(numQuestions);
  const questions: TriviaQuestion[] = [];

  for (const diff of difficulties) {
    const matches = source.filter(
      (q) => q.difficulty === diff && !questions.some((s) => s.id === q.id),
    );
    if (matches.length > 0) {
      questions.push(pickRandom(matches));
    } else {
      const fallback = source.filter((q) => !questions.some((s) => s.id === q.id));
      if (fallback.length > 0) questions.push(pickRandom(fallback));
    }
  }

  return {
    minigame: "trivia",
    phase: "transition",
    selectedPlayerIds: players.map((p) => p.id),
    data: {
      questions: questions.map((q) => q.id),
      currentQuestion: 0,
      questionData: questions,
    },
    startedAt: new Date().toISOString(),
  };
}

function selectTriviadifficulties(count: number): string[] {
  const diffs: string[] = [];
  for (let i = 0; i < count; i++) {
    diffs.push(
      weightedRandom([
        { value: "easy", weight: 30 },
        { value: "medium", weight: 30 },
        { value: "hard", weight: 30 },
        { value: "ruinous", weight: 10 },
      ]),
    );
  }
  return diffs;
}

export function buildScategoriesRound(selectedPlayer: Player, usedIds: string[]): CurrentRound {
  const available = scategoryCategories.filter((c) => !usedIds.includes(c.id));
  const pool = available.length > 0 ? available : scategoryCategories;
  const category = pickRandom(pool);
  const letter = pickRandom(scategoryLetters);

  return {
    minigame: "scategories",
    phase: "transition",
    selectedPlayerIds: [selectedPlayer.id],
    data: { categoryId: category.id, category: category.category, letter },
    startedAt: new Date().toISOString(),
  };
}

export function buildFiftyFiftyRound(selectedPlayer: Player): CurrentRound {
  const type = Math.random() < 0.5 ? "penalty" : "bonus";
  const rarity = weightedRandom([
    { value: "common" as const, weight: 65 },
    { value: "rare" as const, weight: 30 },
    { value: "legendary" as const, weight: 5 },
  ]);

  const pool = type === "penalty" ? fiftyFifty.penalties : fiftyFifty.bonuses;
  const actions = pool[rarity];
  const action = pickRandom(actions);

  return {
    minigame: "fifty-fifty",
    phase: "transition",
    selectedPlayerIds: [selectedPlayer.id],
    data: { type, rarity, actionId: action.id, action: action.action },
    startedAt: new Date().toISOString(),
  };
}

export function rollWorldEvent(usedIds: string[]): { id: string; event: string } | null {
  if (Math.random() > 0.5) return null;
  const available = worldEvents.filter((e) => !usedIds.includes(e.id));
  const pool = available.length > 0 ? available : worldEvents;
  return pickRandom(pool);
}

export function rollFunFact(ffiCount: number, usedIds: string[]): { id: string; text: string; type: string } | null {
  if (Math.random() > 0.4) return null;
  const rotation = ["fact", "ridiculous", "escher"] as const;
  const requiredType = rotation[ffiCount % 3];
  const available = funFacts.filter((f) => f.type === requiredType && !usedIds.includes(f.id));
  const pool = available.length > 0 ? available : funFacts.filter((f) => f.type === requiredType);
  if (pool.length === 0) return null;
  const fact = pickRandom(pool);
  return { id: fact.id, text: fact.text, type: fact.type };
}

export async function updateGameRound(gameId: string, round: CurrentRound | null) {
  await getSupabase().from("games").update({ current_round: round }).eq("id", gameId);
}

export async function updateRoundPhase(gameId: string, currentRound: CurrentRound, phase: CurrentRound["phase"]) {
  await updateGameRound(gameId, { ...currentRound, phase });
}

export async function addScore(playerId: string, points: number) {
  const sb = getSupabase();
  const { data } = await sb.from("players").select("score").eq("id", playerId).single();
  if (data) {
    await sb.from("players").update({ score: data.score + points }).eq("id", playerId);
  }
}

export async function markContentUsed(gameId: string, contentType: string, contentId: string) {
  await getSupabase().from("used_content").upsert(
    { game_id: gameId, content_type: contentType, content_id: contentId },
    { onConflict: "game_id,content_type,content_id" },
  );
}

export async function getUsedContent(gameId: string, contentType: string): Promise<string[]> {
  const { data } = await getSupabase()
    .from("used_content")
    .select("content_id")
    .eq("game_id", gameId)
    .eq("content_type", contentType);
  return data?.map((r) => r.content_id) ?? [];
}

export function getDifficultyPoints(difficulty: string): number {
  switch (difficulty) {
    case "easy": return 2;
    case "medium": return 3;
    case "hard": return 5;
    case "ruinous": return 10;
    default: return 2;
  }
}

export async function tallyTriviaScores(gameId: string, round: CurrentRound) {
  const sb = getSupabase();
  const questionData = round.data.questionData as TriviaQuestion[];
  const questionIds = questionData.map((q) => q.id);

  const { data: answers } = await sb
    .from("answers")
    .select("*")
    .eq("game_id", gameId)
    .in("question_id", questionIds);

  if (answers) {
    const scoreMap: Record<string, number> = {};
    for (const a of answers) {
      if (!a.is_correct) continue;
      const q = questionData.find((qd) => qd.id === a.question_id);
      const pts = q ? getDifficultyPoints(q.difficulty) : 2;
      scoreMap[a.player_id] = (scoreMap[a.player_id] ?? 0) + pts;
    }
    for (const [pid, pts] of Object.entries(scoreMap)) {
      await addScore(pid, pts);
    }
  }

  for (const qid of questionIds) {
    await markContentUsed(gameId, "trivia", qid);
  }
}

export async function executePendingPurchases(gameId: string) {
  const sb = getSupabase();
  const { data: purchases } = await sb
    .from("purchases")
    .select("*")
    .eq("game_id", gameId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (!purchases || purchases.length === 0) return [];

  const executed: Array<{ buyer: string; item: string; target: string | null }> = [];

  for (const p of purchases) {
    if (p.item_id === "shop-heist" && p.target_id) {
      await addScore(p.target_id, -5);
      await addScore(p.buyer_id, 5);
    }
    await sb.from("purchases").update({ status: "executed" }).eq("id", p.id);
    executed.push({ buyer: p.buyer_id, item: p.item_id, target: p.target_id });
  }

  return executed;
}
