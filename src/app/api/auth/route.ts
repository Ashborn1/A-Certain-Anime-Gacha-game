import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, endSession, hashPassword, setSession, validateEmail, validateName, verifyPassword } from "@/lib/auth";
import { getGameState, seedAdventure } from "@/lib/game";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.mode === "logout") {
      await endSession();
      return NextResponse.json({ ok: true });
    }
    const email = validateEmail(body.email);
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) throw new Error("Use a password between 8 and 128 characters.");
    if (body.mode === "register") {
      const name = validateName(body.name);
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) throw new Error("This email is already registered. Please sign in instead.");
      const guest = await currentUser();
      let user;
      if (guest?.isDemo) {
        [user] = await db.update(users).set({ name, email, passwordHash: hashPassword(body.password), isDemo: false }).where(eq(users.id, guest.id)).returning();
      } else {
        [user] = await db.insert(users).values({ name, email, passwordHash: hashPassword(body.password), isDemo: false }).returning();
        await seedAdventure(user.id, name, false);
      }
      await setSession(user.id);
      return NextResponse.json({ state: await getGameState(user.id), message: "Your adventure is safe. Welcome to Astral!" });
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user?.passwordHash || !verifyPassword(body.password, user.passwordHash)) throw new Error("That email and password don't match. Please try again.");
    await setSession(user.id);
    return NextResponse.json({ state: await getGameState(user.id), message: `Welcome back, ${user.name}!` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't sign you in. Please try again.";
    return NextResponse.json({ error: message.startsWith("Failed query") ? "That email may already be in use. Please try another." : message }, { status: 400 });
  }
}
export async function DELETE() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
    await endSession();
    await db.delete(users).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Your account could not be deleted. Please try again." }, { status: 500 });
  }
}
