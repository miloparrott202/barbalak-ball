import { getSupabase } from "./supabase";
import {
  charades,
  triviaQuestions,
  scategoryCategories,
  scategoryLetters,
  fiftyFifty,
  worldEvents,
  funFacts,
  specialWorldEvents,
  pickRandom,
  shuffleArray,
  weightedRandom,
} from "./content";
import type {
  CurrentRound,
  MinigameType,
  Player,
  TriviaQuestion,
  FiftyFiftyRarity,
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

export function buildCharadesRound(selectedPlayer: Player, usedIds: string[], customPhrases: string[] = [], useDefault = true): CurrentRound {
  let pool: { id: string; phrase: string }[] = [];

  if (useDefault) {
    const available = charades.filter((c) => !usedIds.includes(c.id) && c.phrase?.trim());
    pool = available.length > 0 ? available : charades.filter((c) => c.phrase?.trim());
  }

  const customEntries = customPhrases
    .filter((p) => p.trim() && !usedIds.includes(`custom-${p}`))
    .map((p) => ({ id: `custom-${p}`, phrase: p }));
  pool = [...pool, ...customEntries];

  if (pool.length === 0) pool = charades;
  const phrase = pickRandom(pool);
  return {
    minigame: "charades",
    phase: "transition",
    selectedPlayerIds: [selectedPlayer.id],
    data: { phraseId: phrase.id, phrase: phrase.phrase },
    startedAt: new Date().toISOString(),
  };
}

export function buildTriviaRound(
  players: Player[],
  usedIds: string[],
): CurrentRound {
  const questionCount = Math.max(1, Math.ceil(players.length / 2));
  const available = triviaQuestions.filter((q) => !usedIds.includes(q.id));
  const source = available.length > 0 ? available : triviaQuestions;

  const questions: { question: TriviaQuestion; playerId: string }[] = [];
  const shuffledPlayers = shuffleArray(players);

  for (let i = 0; i < questionCount; i++) {
    const difficulty = weightedRandom([
      { value: "easy" as const, weight: 30 },
      { value: "medium" as const, weight: 30 },
      { value: "hard" as const, weight: 30 },
      { value: "ruinous" as const, weight: 10 },
    ]);

    const matches = source.filter(
      (q) => q.difficulty === difficulty && !questions.some((qr) => qr.question.id === q.id),
    );
    const question = matches.length > 0 ? pickRandom(matches) : pickRandom(source);
    const player = shuffledPlayers[i % shuffledPlayers.length];

    questions.push({ question, playerId: player.id });
  }

  return {
    minigame: "trivia",
    phase: "transition",
    selectedPlayerIds: questions.map((q) => q.playerId),
    data: {
      questions,
      currentQ: 0,
      totalQuestions: questions.length,
    },
    startedAt: new Date().toISOString(),
  };
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

export function buildFiftyFiftyRound(players: Player[]): CurrentRound {
  const selectedPlayer = pickRandom(players);
  const type: "penalty" | "reward" = Math.random() < 0.5 ? "penalty" : "reward";
  const rarity: FiftyFiftyRarity = weightedRandom([
    { value: "common" as const, weight: 50 },
    { value: "uncommon" as const, weight: 35 },
    { value: "rare" as const, weight: 20 },
    { value: "legendary" as const, weight: 5 },
  ]);

  const pool = type === "penalty" ? fiftyFifty.penalties : fiftyFifty.rewards;
  const actions = pool[rarity];
  const action = pickRandom(actions);

  return {
    minigame: "fifty-fifty",
    phase: "transition",
    selectedPlayerIds: [selectedPlayer.id],
    data: {
      type,
      rarity,
      actionId: action.id,
      action: action.action,
      allPlayerIds: players.map((p) => p.id),
    },
    startedAt: new Date().toISOString(),
  };
}

export function rollWorldEvent(usedIds: string[]): { id: string; event: string } | null {
  const available = worldEvents.filter((e) => !usedIds.includes(e.id));
  const pool = available.length > 0 ? available : worldEvents;
  if (pool.length === 0) return null;
  return pickRandom(pool);
}

export function rollFunFact(usedIds: string[]): { id: string; text: string } | null {
  const available = funFacts.filter((f) => !usedIds.includes(f.id));
  const pool = available.length > 0 ? available : funFacts;
  if (pool.length === 0) return null;
  const fact = pickRandom(pool);
  return { id: fact.id, text: fact.text };
}

export function rollSpecialWorldEvent(
  usedIds: string[],
): { id: string; title: string; description: string; targetImage: string } | null {
  const available = specialWorldEvents.filter((e) => !usedIds.includes(e.id));
  const pool = available.length > 0 ? available : specialWorldEvents;
  if (pool.length === 0) return null;
  return pickRandom(pool);
}

type InterRoundResult =
  | { type: "world-event"; id: string; text: string }
  | { type: "fun-fact"; id: string; text: string }
  | { type: "special-world-event"; id: string; title: string; description: string; targetImage: string }
  | null;

export function rollInterRoundEvent(
  enabledIds: string[],
  usedWEIds: string[],
  usedFFIds: string[],
  usedSWEIds: string[] = [],
): InterRoundResult {
  const weEnabled = enabledIds.includes("world-events");
  const ffEnabled = enabledIds.includes("fun-facts");
  const sweEnabled = enabledIds.includes("special-world-events");
  if (!weEnabled && !ffEnabled && !sweEnabled) return null;

  const roll = Math.random() * 100;
  // 30% nothing, 35% fun fact, 30% world event, 5% special world event
  // Normalize when some types are disabled
  const slots: { type: string; weight: number }[] = [];
  slots.push({ type: "nothing", weight: 30 });
  if (ffEnabled) slots.push({ type: "fun-fact", weight: 35 });
  if (weEnabled) slots.push({ type: "world-event", weight: 30 });
  if (sweEnabled) slots.push({ type: "special-world-event", weight: 5 });

  const totalWeight = slots.reduce((s, sl) => s + sl.weight, 0);
  let cumulative = 0;
  let chosen = "nothing";
  const normalizedRoll = roll / 100 * totalWeight;
  for (const slot of slots) {
    cumulative += slot.weight;
    if (normalizedRoll < cumulative) {
      chosen = slot.type;
      break;
    }
  }

  if (chosen === "nothing") return null;

  if (chosen === "special-world-event") {
    const swe = rollSpecialWorldEvent(usedSWEIds);
    if (swe) return { type: "special-world-event", ...swe };
    // fallback to world event
    chosen = "world-event";
  }

  if (chosen === "world-event") {
    const we = rollWorldEvent(usedWEIds);
    if (we) return { type: "world-event", id: we.id, text: we.event };
    const ff = rollFunFact(usedFFIds);
    if (ff) return { type: "fun-fact", id: ff.id, text: ff.text };
    return null;
  }

  if (chosen === "fun-fact") {
    const ff = rollFunFact(usedFFIds);
    if (ff) return { type: "fun-fact", id: ff.id, text: ff.text };
    const we = rollWorldEvent(usedWEIds);
    if (we) return { type: "world-event", id: we.id, text: we.event };
    return null;
  }

  return null;
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
  const { error } = await getSupabase().from("used_content").insert(
    { game_id: gameId, content_type: contentType, content_id: contentId },
  );
  if (error && !error.message.includes("duplicate key")) {
    console.error("markContentUsed error:", error.message);
  }
}

export async function getUsedContent(gameId: string, contentType: string): Promise<string[]> {
  const { data } = await getSupabase()
    .from("used_content")
    .select("content_id")
    .eq("game_id", gameId)
    .eq("content_type", contentType);
  return data?.map((r) => r.content_id) ?? [];
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
