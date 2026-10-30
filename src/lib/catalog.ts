import type { Character, Quest } from "./game-types";

export const CHARACTERS: Character[] = [
  { id: "seraphina", name: "Seraphina", title: "The Starlight Oracle", rarity: 5, element: "Light", role: "Support", attack: 1280, hp: 8800, description: "A celestial oracle who weaves starlight into miracles. Her gentle magic can turn the tide of even the darkest battle.", image: "/images/celestial-banner.jpg", accent: "#8d75b7" },
  { id: "kael", name: "Kael", title: "The Emberblade", rarity: 5, element: "Fire", role: "DPS", attack: 1520, hp: 7400, description: "A wandering swordsman carrying a promise in his burning blade. Every battle brings him closer to the truth of his past.", image: "/images/kael.jpg", accent: "#c8684d" },
  { id: "yuki", name: "Yuki", title: "Winter's Whisper", rarity: 5, element: "Frost", role: "Support", attack: 1120, hp: 9200, description: "Born beneath the first snow, Yuki protects her companions with the quiet strength of an eternal winter.", image: "/images/yuki.jpg", accent: "#6c9fb9" },
  { id: "ren", name: "Ren", title: "The Gale Strider", rarity: 4, element: "Wind", role: "DPS", attack: 980, hp: 6200, description: "A free-spirited ranger whose arrows ride the wind. He has never lost a race—or a friend.", image: "/images/ren.jpg", accent: "#729784" },
  { id: "hana", name: "Hana", title: "The Forest Guardian", rarity: 4, element: "Nature", role: "Healer", attack: 1050, hp: 6700, description: "The old forest whispers through Hana. With a kind heart and ancient magic, she brings life wherever she goes.", image: "/images/hana.jpg", accent: "#83a77f" },
  { id: "kiko", name: "Kiko", title: "The Foxfire Trickster", rarity: 4, element: "Lightning", role: "DPS", attack: 1180, hp: 6100, description: "A quick-witted fox spirit with a mischievous grin. The best way to catch her is to give her a reason to stay.", image: "/images/kiko.jpg", accent: "#dba15a" },
  { id: "orion", name: "Orion", title: "The Moonlit Knight", rarity: 4, element: "Dark", role: "Tank", attack: 910, hp: 10400, description: "A silent guardian of the northern gates. When the moon rises, his ancient blade answers its call.", image: "/images/orion.jpg", accent: "#82719d" },
  { id: "lyra", name: "Lyra", title: "The Ocean's Song", rarity: 3, element: "Water", role: "Healer", attack: 650, hp: 5100, description: "A traveling bard who knows the ocean's oldest songs. Her melodies bring calm to troubled waters.", image: "/images/lyra.jpg", accent: "#6d9dc1" },
  { id: "aether", name: "Aether", title: "The Astral Knight", rarity: 5, element: "Dark", role: "Tank", attack: 1380, hp: 10800, description: "A knight from the world between the stars, Aether protects the dreams of those who dare to wish. Even her darkest nights are full of light.", image: "/images/aether.jpg", accent: "#8f79ad" },
];

export const QUESTS: Omit<Quest, "progress" | "claimed">[] = [
  { id: "summon", title: "A new companion", description: "Perform a summon on any banner", target: 1, reward: 150, type: "summon" },
  { id: "upgrade", title: "Stronger together", description: "Upgrade a character 3 times", target: 3, reward: 200, type: "upgrade" },
  { id: "adventure", title: "Beyond the horizon", description: "Complete 2 adventures", target: 2, reward: 250, type: "adventure" },
  { id: "checkin", title: "A little everyday magic", description: "Claim your daily check-in reward", target: 1, reward: 100, type: "checkin" },
];

export const ITEMS = [
  { id: "stardust", name: "Astral stardust", description: "A little piece of the cosmos. Earned from duplicate pulls; trade 50 for 1,000 gold.", category: "Material", rarity: 4, icon: "sparkles", color: "purple" },
  { id: "xp_book", name: "Traveler's journal", description: "Stories worth sharing. Use it to give a character 100 XP and a level boost.", category: "Experience", rarity: 3, icon: "book", color: "blue" },
  { id: "energy", name: "Moonlight tonic", description: "A refreshing sip of starlight. Restores 30 adventure energy immediately.", category: "Consumable", rarity: 4, icon: "flask", color: "green" },
  { id: "gold_chest", name: "Wanderer's cache", description: "A well-earned reward from your travels. Open to receive 1,000 gold.", category: "Treasure", rarity: 5, icon: "gift", color: "gold" },
];

export const CHAPTERS = [
  { name: "Whispering Woods", description: "Follow the fireflies into a forest that remembers every traveler.", stage: "Chapter 01", power: 3500 },
  { name: "Echoes of the Tides", description: "An ancient melody calls from a forgotten island. Find its source.", stage: "Chapter 02", power: 6000 },
  { name: "The Verdant Path", description: "Beyond the mist, the heart of the forest awaits. A new story begins here.", stage: "Chapter 03", power: 8500 },
  { name: "Starlight Sanctuary", description: "Climb the celestial steps and uncover the secret of the first oracle.", stage: "Chapter 04", power: 12000 },
  { name: "The Astral Gate", description: "Your companions are ready. Cross the threshold into a world of wonder.", stage: "Chapter 05", power: 16000 },
];

export const getCharacter = (id: string) => CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
export const powerOf = (character: { level: number; duplicates: number; character: Character }) => Math.round((character.character.attack + character.character.hp * 0.28) * (1 + character.level * 0.05) * (1 + character.duplicates * 0.1));
export const today = () => new Date().toISOString().slice(0, 10);
