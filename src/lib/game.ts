import { randomInt, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, profiles, ownedCharacters, teams, questProgress, summonHistory, inventory } from "@/db/schema";
import { CHARACTERS, QUESTS, getCharacter, powerOf, today, CHAPTERS } from "./catalog";
import { type GameAction, type GameState, type Pull } from "./game-types";
import { setSession, currentUser } from "./auth";

export async function seedAdventure(userId: string, name = "Akira", demo = true) {
  await db.transaction(async (tx) => {
    await tx.insert(profiles).values({ userId });
    await tx.insert(ownedCharacters).values(CHARACTERS.slice(0, demo ? 8 : 3).map((character, index) => ({
      userId, definitionId: character.id, level: demo ? [40, 35, 32, 28, 22, 18, 12, 1][index] : 1,
      favorite: index < 2, duplicates: index === 0 ? 1 : 0,
    }))).returning();
    const seeded = await tx.select().from(ownedCharacters).where(eq(ownedCharacters.userId, userId));
    const id = (definition: string) => seeded.find((character) => character.definitionId === definition)!.id;
    await tx.insert(teams).values([
      { userId, name: "The starlight squad", characterIds: [id("seraphina"), id("kael"), id("yuki"), ...(demo ? [id("hana")] : [])], active: true },
      { userId, name: "Into the wild", characterIds: demo ? [id("ren"), id("hana"), id("orion")] : [id("kael"), id("yuki")], active: false },
    ]);
    await tx.insert(questProgress).values(QUESTS.map((quest) => ({ userId, questId: quest.id, progress: demo && quest.id === "adventure" ? 1 : 0, claimed: false, day: today() })));
    await tx.insert(inventory).values([
      { userId, itemId: "stardust", quantity: 1250 },
      { userId, itemId: "xp_book", quantity: 24 },
      { userId, itemId: "energy", quantity: 3 },
      { userId, itemId: "gold_chest", quantity: 2 },
    ]);
    if (demo) {
      await tx.update(profiles).set({ totalPulls: 48, pity: 12 }).where(eq(profiles.userId, userId));
      const seededPulls = Array.from({ length: 48 }, (_, index) => ({
        userId, definitionId: CHARACTERS[index % 8].id, isNew: index < 8, cost: 160,
        createdAt: new Date(Date.now() - (index + 1) * 7200000),
      }));
      await tx.insert(summonHistory).values(seededPulls);
    }
    if (!demo) {
      await tx.update(profiles).set({ gems: 2400, gold: 5000, chapter: 1, level: 1, xp: 0, loginStreak: 0, adventureWins: 0, energy: 120 }).where(eq(profiles.userId, userId));
      await tx.update(inventory).set({ quantity: 0 }).where(eq(inventory.userId, userId));
      await tx.update(inventory).set({ quantity: 12 }).where(and(eq(inventory.userId, userId), eq(inventory.itemId, "xp_book")));
      await tx.update(inventory).set({ quantity: 3 }).where(and(eq(inventory.userId, userId), eq(inventory.itemId, "energy")));
      await tx.update(inventory).set({ quantity: 1 }).where(and(eq(inventory.userId, userId), eq(inventory.itemId, "gold_chest")));
      await tx.update(ownedCharacters).set({ favorite: false, duplicates: 0 }).where(eq(ownedCharacters.userId, userId));
    }
    if (!demo) await tx.update(users).set({ name }).where(eq(users.id, userId));
  });
}

export async function ensureAdventure() {
  let user = await currentUser();
  if (!user) {
    const [created] = await db.insert(users).values({ name: "Akira", isDemo: true }).returning();
    user = created;
    await seedAdventure(user.id);
    await setSession(user.id);
  }
  return user;
}

export async function getGameState(userId: string): Promise<GameState> {
  const [[user], [profile], roster, teamList, progressList, pulls, items] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(ownedCharacters).where(eq(ownedCharacters.userId, userId)).orderBy(desc(ownedCharacters.level)),
    db.select().from(teams).where(eq(teams.userId, userId)).orderBy(teams.createdAt),
    db.select().from(questProgress).where(and(eq(questProgress.userId, userId), eq(questProgress.day, today()))),
    db.select().from(summonHistory).where(eq(summonHistory.userId, userId)).orderBy(desc(summonHistory.createdAt)).limit(100),
    db.select().from(inventory).where(eq(inventory.userId, userId)),
  ]);
  if (!user || !profile) throw new Error("This adventure could not be found. Please sign in again.");
  const updatedEnergy = Math.min(120, profile.energy + Math.floor((Date.now() - profile.energyUpdatedAt.getTime()) / 300000));
  if (updatedEnergy !== profile.energy) {
    await db.update(profiles).set({ energy: updatedEnergy, energyUpdatedAt: new Date() }).where(eq(profiles.userId, userId));
    profile.energy = updatedEnergy;
  }
  if (!progressList.length) {
    await db.insert(questProgress).values(QUESTS.map((quest) => ({ userId, questId: quest.id, progress: 0, claimed: false, day: today() }))).onConflictDoNothing();
    progressList.push(...await db.select().from(questProgress).where(and(eq(questProgress.userId, userId), eq(questProgress.day, today()))));
  }
  const { passwordHash: _password, ...safeUser } = user;
  const { userId: _id, energyUpdatedAt: _energyTime, lastAdventure: _adventureTime, ...safeProfile } = profile;
  void _password; void _id; void _energyTime; void _adventureTime;
  return {
    user: { ...safeUser, createdAt: user.createdAt.toISOString() }, profile: safeProfile,
    characters: roster.map((character) => ({ ...character, character: getCharacter(character.definitionId), acquiredAt: character.acquiredAt.toISOString() })),
    teams: teamList,
    quests: QUESTS.map((quest) => ({ ...quest, progress: progressList.find((p) => p.questId === quest.id)?.progress ?? 0, claimed: progressList.find((p) => p.questId === quest.id)?.claimed ?? false })),
    history: pulls.map((pull) => ({ ...pull, character: getCharacter(pull.definitionId), createdAt: pull.createdAt.toISOString() })),
    inventory: items,
  };
}

export async function performAction(userId: string, action: GameAction) {
  let message = "Your adventure has been updated.";
  const results: Pull[] = [];
  await db.transaction(async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for("update");
    if (!profile) throw new Error("Your adventure could not be found.");
    const roster = await tx.select().from(ownedCharacters).where(eq(ownedCharacters.userId, userId));
    const progress = async (type: string, amount = 1) => {
      await tx.insert(questProgress).values({ userId, questId: type, progress: amount, day: today() }).onConflictDoUpdate({
        target: [questProgress.userId, questProgress.questId, questProgress.day],
        set: { progress: sql`${questProgress.progress} + ${amount}` },
      });
    };
    const rewardXp = async (amount: number) => {
      const total = profile.xp + amount;
      await tx.update(profiles).set({ xp: total % 1000, level: profile.level + Math.floor(total / 1000) }).where(eq(profiles.userId, userId));
      profile.xp = total % 1000;
      profile.level += Math.floor(total / 1000);
    };
    switch (action.type) {
      case "summon": {
        const count = action.count === 10 ? 10 : 1;
        const cost = count === 10 ? 1600 : 160;
        if (profile.gems < cost) throw new Error(`You need ${cost.toLocaleString()} Astral Gems for this summon. Try a daily quest or adventure to earn more.`);
        let pity = profile.pity;
        const newPulls: typeof summonHistory.$inferInsert[] = [];
        for (let i = 0; i < count; i++) {
          const roll = randomInt(10000);
          pity++;
          const guaranteed = count === 10 && i === 9 && newPulls.every((pull) => getCharacter(pull.definitionId).rarity < 4);
          let rarity: 3 | 4 | 5 = roll < 120 ? 5 : roll < 1400 ? 4 : 3;
          if (pity >= 60) rarity = 5;
          else if (guaranteed && rarity === 3) rarity = 4;
          if (rarity === 5) pity = 0;
          const pool = CHARACTERS.filter((character) => character.rarity === rarity);
          const selected = rarity === 5 && randomInt(2) === 0 ? CHARACTERS[0] : pool[randomInt(pool.length)];
          const existing = roster.find((owned) => owned.definitionId === selected.id);
          const previous = newPulls.find((pull) => pull.definitionId === selected.id);
          if (existing || previous) {
            const target = existing?.id;
            if (target) await tx.update(ownedCharacters).set({ duplicates: sql`${ownedCharacters.duplicates} + 1` }).where(eq(ownedCharacters.id, target));
            await tx.insert(inventory).values({ userId, itemId: "stardust", quantity: 50 }).onConflictDoUpdate({ target: [inventory.userId, inventory.itemId], set: { quantity: sql`${inventory.quantity} + 50` } });
          } else {
            const [added] = await tx.insert(ownedCharacters).values({ userId, definitionId: selected.id, level: 1 }).returning();
            roster.push(added);
          }
          const pull = { id: randomUUID(), userId, definitionId: selected.id, isNew: !existing && !previous, cost: 160, createdAt: new Date() };
          newPulls.push(pull);
          results.push({ ...pull, character: selected, createdAt: pull.createdAt.toISOString() });
        }
        await tx.insert(summonHistory).values(newPulls);
        await tx.update(profiles).set({ gems: profile.gems - cost, pity, totalPulls: profile.totalPulls + count }).where(eq(profiles.userId, userId));
        await progress("summon");
        await rewardXp(count * 20);
        message = count === 10 ? "Ten wishes, a world of possibilities. Your new companions are here!" : "A new wish answered. Welcome to your story!";
        break;
      }
      case "upgrade": {
        const owned = roster.find((character) => character.id === action.characterId);
        if (!owned) throw new Error("This character is not in your collection.");
        if (owned.level >= 80) throw new Error("This character has reached the maximum level of 80!");
        const cost = 500 + Math.floor(owned.level / 10) * 150;
        if (profile.gold < cost) throw new Error("You need more gold. Complete an adventure or trade stardust.");
        await tx.update(ownedCharacters).set({ level: owned.level + 1, xp: owned.xp + 100 }).where(eq(ownedCharacters.id, owned.id));
        await tx.update(profiles).set({ gold: profile.gold - cost }).where(eq(profiles.userId, userId));
        await progress("upgrade");
        await rewardXp(15);
        message = `${getCharacter(owned.definitionId).name} is now level ${owned.level + 1}. Stronger, together!`;
        break;
      }
      case "favorite": {
        const owned = roster.find((character) => character.id === action.characterId);
        if (!owned) throw new Error("Character not found.");
        await tx.update(ownedCharacters).set({ favorite: !owned.favorite }).where(eq(ownedCharacters.id, owned.id));
        message = owned.favorite ? "Removed from your favorites." : "Added to your favorites.";
        break;
      }
      case "release": {
        const owned = roster.find((character) => character.id === action.characterId);
        if (!owned) throw new Error("Character not found.");
        if (owned.favorite) throw new Error("Unfavorite this character before releasing them.");
        if (roster.length <= 1) throw new Error("Keep at least one companion for your next adventure.");
        const assigned = await tx.select().from(teams).where(eq(teams.userId, userId));
        for (const team of assigned) {
          if (team.characterIds.includes(owned.id)) await tx.update(teams).set({ characterIds: team.characterIds.filter((id) => id !== owned.id) }).where(eq(teams.id, team.id));
        }
        await tx.delete(ownedCharacters).where(eq(ownedCharacters.id, owned.id));
        await tx.update(profiles).set({ gold: profile.gold + 1000 }).where(eq(profiles.userId, userId));
        message = `${getCharacter(owned.definitionId).name} was released. You received 1,000 gold.`;
        break;
      }
      case "create-team":
      case "update-team": {
        const name = typeof action.name === "string" ? action.name.trim().slice(0, 32) : "";
        if (name.length < 2) throw new Error("Give your team a name with at least 2 characters.");
        const ids = Array.isArray(action.characterIds) ? action.characterIds.filter((id): id is string => typeof id === "string").slice(0, 4) : [];
        if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !roster.find((character) => character.id === id))) throw new Error("Choose 1–4 unique characters from your collection.");
        if (action.type === "create-team") {
          const existingTeams = await tx.select().from(teams).where(eq(teams.userId, userId));
          if (existingTeams.length >= 8) throw new Error("You can have up to 8 teams. Delete one to make room.");
          await tx.insert(teams).values({ userId, name, characterIds: ids, active: !existingTeams.length });
          message = `Team “${name}” is ready for adventure.`;
        } else {
          const [team] = await tx.select().from(teams).where(and(eq(teams.id, String(action.teamId)), eq(teams.userId, userId)));
          if (!team) throw new Error("Team not found.");
          await tx.update(teams).set({ name, characterIds: ids }).where(eq(teams.id, team.id));
          message = `Team “${name}” updated.`;
        }
        break;
      }
      case "delete-team": {
        const [team] = await tx.select().from(teams).where(and(eq(teams.id, String(action.teamId)), eq(teams.userId, userId)));
        if (!team) throw new Error("Team not found.");
        await tx.delete(teams).where(eq(teams.id, team.id));
        if (team.active) {
          const [next] = await tx.select().from(teams).where(eq(teams.userId, userId)).limit(1);
          if (next) await tx.update(teams).set({ active: true }).where(eq(teams.id, next.id));
        }
        message = "Team disbanded. Your characters are safe in your collection.";
        break;
      }
      case "activate-team": {
        const [team] = await tx.select().from(teams).where(and(eq(teams.id, String(action.teamId)), eq(teams.userId, userId)));
        if (!team || !team.characterIds.length) throw new Error("Add some companions to this team first.");
        await tx.update(teams).set({ active: false }).where(eq(teams.userId, userId));
        await tx.update(teams).set({ active: true }).where(eq(teams.id, team.id));
        message = `“${team.name}” is now your active team.`;
        break;
      }
      case "daily-claim": {
        if (profile.lastCheckin === today()) throw new Error("Today's reward is already yours. Come back tomorrow!");
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = profile.lastCheckin === yesterday ? profile.loginStreak + 1 : 1;
        const gems = streak % 7 === 0 ? 500 : 300;
        await tx.update(profiles).set({ gems: profile.gems + gems, lastCheckin: today(), loginStreak: streak }).where(eq(profiles.userId, userId));
        await tx.insert(inventory).values({ userId, itemId: "xp_book", quantity: 2 }).onConflictDoUpdate({ target: [inventory.userId, inventory.itemId], set: { quantity: sql`${inventory.quantity} + 2` } });
        await progress("checkin");
        await rewardXp(50);
        message = `A little daily magic: +${gems} gems and 2 Traveler's journals!`;
        break;
      }
      case "quest-claim": {
        const quest = QUESTS.find((q) => q.id === action.questId);
        if (!quest) throw new Error("Quest not found.");
        const [current] = await tx.select().from(questProgress).where(and(eq(questProgress.userId, userId), eq(questProgress.questId, quest.id), eq(questProgress.day, today())));
        if (!current || current.progress < quest.target) throw new Error("Keep going—complete this quest to claim its reward.");
        if (current.claimed) throw new Error("You've already claimed this reward.");
        await tx.update(questProgress).set({ claimed: true }).where(and(eq(questProgress.userId, userId), eq(questProgress.questId, quest.id), eq(questProgress.day, today())));
        await tx.update(profiles).set({ gems: profile.gems + quest.reward }).where(eq(profiles.userId, userId));
        await rewardXp(25);
        message = `Quest complete! +${quest.reward} Astral Gems. Beautifully done.`;
        break;
      }
      case "use-item": {
        const [item] = await tx.select().from(inventory).where(and(eq(inventory.userId, userId), eq(inventory.itemId, String(action.itemId)))).for("update");
        if (!item || item.quantity < 1) throw new Error("You don't have this item.");
        if (item.itemId === "xp_book") {
          const owned = roster.find((character) => character.id === action.characterId);
          if (!owned) throw new Error("Choose a character to receive this experience.");
          if (owned.level >= 80) throw new Error("This character is already at maximum level.");
          await tx.update(ownedCharacters).set({ level: owned.level + 1, xp: owned.xp + 100 }).where(eq(ownedCharacters.id, owned.id));
          await progress("upgrade");
        } else if (item.itemId === "energy") {
          const energy = Math.min(120, profile.energy + Math.floor((Date.now() - profile.energyUpdatedAt.getTime()) / 300000));
          if (energy >= 120) throw new Error("Your energy is already full. Save this tonic for later!");
          await tx.update(profiles).set({ energy: Math.min(120, energy + 30), energyUpdatedAt: new Date() }).where(eq(profiles.userId, userId));
        } else if (item.itemId === "gold_chest") {
          await tx.update(profiles).set({ gold: profile.gold + 1000 }).where(eq(profiles.userId, userId));
        } else if (item.itemId === "stardust") {
          if (item.quantity < 50) throw new Error("Collect 50 stardust to trade for 1,000 gold.");
          await tx.update(profiles).set({ gold: profile.gold + 1000 }).where(eq(profiles.userId, userId));
          await tx.update(inventory).set({ quantity: item.quantity - 50 }).where(eq(inventory.id, item.id));
          message = "Stardust traded! +1,000 gold.";
          return;
        } else throw new Error("This item is a collectible and cannot be consumed.");
        await tx.update(inventory).set({ quantity: item.quantity - 1 }).where(eq(inventory.id, item.id));
        message = "Item used. A little boost for your next adventure!";
        break;
      }
      case "adventure": {
        const [team] = await tx.select().from(teams).where(and(eq(teams.userId, userId), eq(teams.active, true)));
        if (!team || !team.characterIds.length) throw new Error("Build or activate a team before heading out.");
        const activeRoster = roster.filter((character) => team.characterIds.includes(character.id));
        const power = activeRoster.reduce((sum, char) => sum + powerOf({ ...char, character: getCharacter(char.definitionId) }), 0);
        const chapter = CHAPTERS[Math.min(profile.chapter - 1, CHAPTERS.length - 1)];
        if (power < chapter.power) throw new Error(`Your team needs ${chapter.power.toLocaleString()} power. Upgrade your characters or add more companions.`);
        const energy = Math.min(120, profile.energy + Math.floor((Date.now() - profile.energyUpdatedAt.getTime()) / 300000));
        if (energy < 20) throw new Error("An adventure costs 20 energy. Use a Moonlight tonic or rest for a little while.");
        const won = profile.chapter < CHAPTERS.length ? 1 : 0;
        await tx.update(profiles).set({ energy: energy - 20, energyUpdatedAt: new Date(), chapter: profile.chapter + won, adventureWins: profile.adventureWins + 1, gold: profile.gold + 1200, gems: profile.gems + 100 }).where(eq(profiles.userId, userId));
        await progress("adventure");
        await rewardXp(150);
        await tx.insert(inventory).values({ userId, itemId: "gold_chest", quantity: 1 }).onConflictDoUpdate({ target: [inventory.userId, inventory.itemId], set: { quantity: sql`${inventory.quantity} + 1` } });
        message = `${chapter.name} complete! +100 gems, +1,200 gold, +150 XP.`;
        break;
      }
      case "update-profile": {
        const name = typeof action.name === "string" ? action.name.trim() : "";
        if (name.length < 2 || name.length > 30) throw new Error("Choose a name with 2–30 characters.");
        await tx.update(users).set({ name }).where(eq(users.id, userId));
        message = "Your adventurer profile has been updated.";
        break;
      }
      default: throw new Error("That action is not available.");
    }
  });
  return { state: await getGameState(userId), message, results };
}
