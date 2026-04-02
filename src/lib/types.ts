export type GameStatus = "lobby" | "settings" | "playing" | "finished";

export type MinigameType = "charades" | "trivia" | "scategories" | "fifty-fifty";

export type RoundPhase =
  | "scoreboard"
  | "event"
  | "transition"
  | "staging"
  | "active"
  | "result";

export interface Game {
  id: string;
  short_code: string;
  status: GameStatus;
  point_threshold: number;
  enabled_categories: string[];
  current_round: CurrentRound | null;
  round_number: number;
  ffi_count: number;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  icon_id?: string;
  is_host: boolean;
  score: number;
  created_at: string;
}

export interface CurrentRound {
  minigame: MinigameType;
  phase: RoundPhase;
  selectedPlayerIds: string[];
  data: Record<string, unknown>;
  startedAt: string;
}

export interface Purchase {
  id: string;
  game_id: string;
  buyer_id: string;
  target_id: string | null;
  item_id: string;
  cost: number;
  status: "pending" | "executed" | "cancelled";
  created_at: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  requiresTarget: boolean;
}

export interface TriviaQuestion {
  id: string;
  difficulty: "easy" | "medium" | "hard" | "ruinous";
  question: string;
  options: string[];
  answer: number;
}

export interface CharadesPhrase {
  id: string;
  phrase: string;
  difficulty: "normal" | "impossible";
}

export interface ScategoryEntry {
  id: string;
  category: string;
}

export interface FiftyFiftyAction {
  id: string;
  action: string;
}

export interface FiftyFiftyPool {
  penalties: { common: FiftyFiftyAction[]; rare: FiftyFiftyAction[]; legendary: FiftyFiftyAction[] };
  bonuses: { common: FiftyFiftyAction[]; rare: FiftyFiftyAction[]; legendary: FiftyFiftyAction[] };
}

export interface WorldEvent {
  id: string;
  event: string;
}

export interface FunFact {
  id: string;
  type: "fact" | "ridiculous" | "escher";
  text: string;
}
