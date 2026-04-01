import triviaData from "../../content/trivia.json";
import charadesData from "../../content/charades.json";
import iconsData from "../../content/icons.json";
import categoriesData from "../../content/categories.json";

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface CharadesPrompt {
  id: string;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface IconDef {
  id: string;
  label: string;
  file: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  description: string;
  dataFile: string;
  enabled: boolean;
}

export const trivia: TriviaQuestion[] = triviaData as TriviaQuestion[];
export const charades: CharadesPrompt[] = charadesData as CharadesPrompt[];
export const icons: IconDef[] = iconsData as IconDef[];
export const categories: CategoryDef[] = categoriesData as CategoryDef[];

export function getTriviaByDifficulty(difficulty: string): TriviaQuestion[] {
  return trivia.filter((q) => q.difficulty === difficulty);
}

export function getCharadesByDifficulty(difficulty: string): CharadesPrompt[] {
  return charades.filter((p) => p.difficulty === difficulty);
}
