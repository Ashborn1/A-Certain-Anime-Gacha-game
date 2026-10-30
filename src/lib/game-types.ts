export type Page = "overview" | "summon" | "characters" | "teams" | "adventure" | "quests" | "inventory" | "history" | "settings";
export type Element = "Light" | "Fire" | "Frost" | "Wind" | "Nature" | "Lightning" | "Dark" | "Water";
export type Character = {
  id: string; name: string; title: string; rarity: 3 | 4 | 5; element: Element;
  role: string; attack: number; hp: number; description: string; image: string; accent: string;
};
export type OwnedCharacter = {
  id: string; definitionId: string; level: number; xp: number; duplicates: number; favorite: boolean;
  acquiredAt: string; character: Character;
};
export type Profile = {
  gems: number; gold: number; energy: number; level: number; xp: number; pity: number;
  totalPulls: number; loginStreak: number; lastCheckin: string | null; chapter: number; adventureWins: number;
};
export type Team = { id: string; name: string; characterIds: string[]; active: boolean };
export type Quest = { id: string; title: string; description: string; target: number; reward: number; type: string; progress: number; claimed: boolean };
export type Pull = { id: string; definitionId: string; isNew: boolean; cost: number; createdAt: string; character: Character };
export type InventoryItem = { id: string; itemId: string; quantity: number };
export type GameState = {
  user: { id: string; name: string; email: string | null; isDemo: boolean; createdAt: string };
  profile: Profile; characters: OwnedCharacter[]; teams: Team[]; quests: Quest[]; history: Pull[]; inventory: InventoryItem[];
};
export type GameAction = { type: string; [key: string]: unknown };
export type GameResponse = { state?: GameState; message?: string; error?: string; results?: Pull[] };
