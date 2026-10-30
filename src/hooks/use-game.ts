"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHARACTERS, QUESTS, getCharacter, today } from "@/lib/catalog";
import type { GameAction, GameResponse, GameState } from "@/lib/game-types";

const preview: GameState = {
  user: { id: "preview", name: "Akira", email: null, isDemo: true, createdAt: "2026-06-01T00:00:00.000Z" },
  profile: { gems: 2400, gold: 18500, energy: 85, level: 12, xp: 340, pity: 12, totalPulls: 48, loginStreak: 3, lastCheckin: null, chapter: 3, adventureWins: 12 },
  characters: CHARACTERS.slice(0, 8).map((character, i) => ({ id: `preview-${character.id}`, definitionId: character.id, level: [40, 35, 32, 28, 22, 18, 12, 1][i], xp: 0, duplicates: i === 0 ? 1 : 0, favorite: i < 2, acquiredAt: "2026-06-01T00:00:00.000Z", character })),
  teams: [{ id: "preview-team", name: "The starlight squad", characterIds: ["preview-seraphina", "preview-kael", "preview-yuki", "preview-hana"], active: true }, { id: "preview-team-2", name: "Into the wild", characterIds: ["preview-ren", "preview-hana", "preview-orion"], active: false }],
  quests: QUESTS.map((quest) => ({ ...quest, progress: quest.id === "adventure" ? 1 : 0, claimed: false })),
  inventory: [{ id: "preview-stardust", itemId: "stardust", quantity: 1250 }, { id: "preview-journal", itemId: "xp_book", quantity: 24 }, { id: "preview-tonic", itemId: "energy", quantity: 3 }, { id: "preview-cache", itemId: "gold_chest", quantity: 2 }],
  history: ["yuki", "kael", "seraphina"].map((id, i) => ({ id: `preview-pull-${id}`, definitionId: id, isNew: true, cost: 160, createdAt: "2026-06-01T00:00:00.000Z", character: getCharacter(id) })),
};

function optimistic(state: GameState, action: GameAction): GameState {
  const next = structuredClone(state);
  const p = next.profile;
  if (action.type === "summon") {
    const cost = action.count === 10 ? 1600 : 160;
    p.gems -= cost;
  }
  if (action.type === "upgrade") {
    const char = next.characters.find((char) => char.id === action.characterId);
    if (char) { p.gold -= 500 + Math.floor(char.level / 10) * 150; char.level++; }
  }
  if (action.type === "favorite") {
    const char = next.characters.find((char) => char.id === action.characterId);
    if (char) char.favorite = !char.favorite;
  }
  if (action.type === "daily-claim") { p.gems += (p.loginStreak + 1) % 7 === 0 ? 500 : 300; p.loginStreak++; p.lastCheckin = today(); }
  if (action.type === "quest-claim") {
    const quest = next.quests.find((quest) => quest.id === action.questId);
    if (quest) { quest.claimed = true; p.gems += quest.reward; }
  }
  if (action.type === "delete-team") next.teams = next.teams.filter((team) => team.id !== action.teamId);
  if (action.type === "activate-team") next.teams = next.teams.map((team) => ({ ...team, active: team.id === action.teamId }));
  if (action.type === "update-profile" && typeof action.name === "string") next.user.name = action.name;
  if (action.type === "use-item") {
    const item = next.inventory.find((item) => item.itemId === action.itemId);
    if (item) item.quantity = Math.max(0, item.quantity - (item.itemId === "stardust" ? 50 : 1));
  }
  return next;
}

export function useGame() {
  const [state, setState] = useState<GameState>(preview);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const lock = useRef(false);
  const notify = useCallback((message: string, type: "success" | "error" = "success") => setToast({ message, type }), []);
  const load = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/game", { cache: "no-store" });
      const data: GameResponse = await response.json();
      if (!response.ok || !data.state) throw new Error(data.error || "Could not connect to your adventure.");
      setState(data.state); setReady(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not connect. Please try again."); }
  }, []);
  useEffect(() => { void load(); const onFocus = () => { if (!lock.current) void load(); }; const interval = setInterval(onFocus, 60000); window.addEventListener("focus", onFocus); return () => { clearInterval(interval); window.removeEventListener("focus", onFocus); }; }, [load]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(null), 4800); return () => clearTimeout(timeout); }, [toast]);
  const run = useCallback(async (action: GameAction): Promise<GameResponse | null> => {
    if (!ready) { notify("Your adventure is still connecting. Please try again in a moment.", "error"); return null; }
    if (lock.current) return null;
    lock.current = true;
    const previous = state;
    setBusy(action.type);
    setState(optimistic(state, action));
    try {
      const response = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const data: GameResponse = await response.json();
      if (!response.ok || !data.state) throw new Error(data.error || "That action couldn't be saved.");
      setState(data.state);
      if (data.message) notify(data.message);
      return data;
    } catch (err) {
      setState(previous);
      notify(err instanceof Error ? err.message : "Something went wrong. Your progress is safe.", "error");
      return null;
    } finally { lock.current = false; setBusy(""); }
  }, [ready, state, notify]);
  return { state, setState, ready, error, busy, toast, setToast, notify, load, run };
}
