import type {
  TriviaQuestion,
  CharadesPhrase,
  ScategoryEntry,
  FiftyFiftyPool,
  WorldEvent,
  FunFact,
  ShopItem,
} from "./types";

import charadesData from "../../content/charades.json";
import triviaData from "../../content/trivia.json";
import scategoriesData from "../../content/scategories.json";
import fiftyFiftyData from "../../content/fifty-fifty.json";
import worldEventsData from "../../content/world-events.json";
import funFactsData from "../../content/fun-facts.json";
import shopItemsData from "../../content/shop-items.json";
import categoriesData from "../../content/categories.json";
import loadingScreenData from "../../content/loading-screen.json";
import specialWorldEventsData from "../../content/special-world-events.json";

export const charades = charadesData as CharadesPhrase[];

export const triviaQuestions = triviaData as TriviaQuestion[];

export const scategoryCategories = (scategoriesData as { categories: ScategoryEntry[]; letters: string[] }).categories;
export const scategoryLetters = (scategoriesData as { categories: ScategoryEntry[]; letters: string[] }).letters;

export const fiftyFifty = fiftyFiftyData as FiftyFiftyPool;
export const worldEvents = worldEventsData as WorldEvent[];
export const funFacts = funFactsData as FunFact[];
export const shopItems = shopItemsData as ShopItem[];
export const categories = categoriesData as Array<{
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  type: string;
  dataFile?: string;
  subcategories?: Array<{ id: string; label: string; dataFile: string; enabled: boolean }>;
}>;

export const loadingScreenRules = (loadingScreenData as { rules: string[] }).rules;

export interface SpecialWorldEvent {
  id: string;
  title: string;
  description: string;
  targetImage: string;
}
export const specialWorldEvents = specialWorldEventsData as SpecialWorldEvent[];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}
