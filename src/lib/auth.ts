import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "astral_session";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(key, "hex");
  return original.length === derived.length && timingSafeEqual(original, derived);
}
export async function setSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 30 * 86400000) });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE === "true", maxAge: 30 * 86400, path: "/" });
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [result] = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return result?.user ?? null;
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}
export function validateEmail(value: unknown): string {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new Error("Please enter a valid email address.");
  return value.trim().toLowerCase();
}
export function validateName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 30) throw new Error("Your name should be 2–30 characters long.");
  return value.trim();
}
