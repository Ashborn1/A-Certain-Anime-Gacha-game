import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 30 }).notNull(),
  email: varchar("email", { length: 254 }).unique(),
  passwordHash: text("password_hash"),
  isDemo: boolean("is_demo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  gems: integer("gems").notNull().default(2400),
  gold: integer("gold").notNull().default(18500),
  energy: integer("energy").notNull().default(85),
  energyUpdatedAt: timestamp("energy_updated_at").defaultNow().notNull(),
  level: integer("level").notNull().default(12),
  xp: integer("xp").notNull().default(340),
  pity: integer("pity").notNull().default(0),
  totalPulls: integer("total_pulls").notNull().default(0),
  loginStreak: integer("login_streak").notNull().default(3),
  lastCheckin: varchar("last_checkin", { length: 10 }),
  chapter: integer("chapter").notNull().default(3),
  adventureWins: integer("adventure_wins").notNull().default(12),
  lastAdventure: timestamp("last_adventure"),
});

export const ownedCharacters = pgTable("owned_characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  definitionId: varchar("definition_id", { length: 32 }).notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  favorite: boolean("favorite").notNull().default(false),
  acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("owned_user_character").on(table.userId, table.definitionId)]);

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 32 }).notNull(),
  characterIds: jsonb("character_ids").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questProgress = pgTable("quest_progress", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questId: varchar("quest_id", { length: 32 }).notNull(),
  progress: integer("progress").notNull().default(0),
  claimed: boolean("claimed").notNull().default(false),
  day: varchar("day", { length: 10 }).notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.questId, table.day] })]);

export const summonHistory = pgTable("summon_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  definitionId: varchar("definition_id", { length: 32 }).notNull(),
  isNew: boolean("is_new").notNull().default(true),
  cost: integer("cost").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 32 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [uniqueIndex("inventory_user_item").on(table.userId, table.itemId)]);
