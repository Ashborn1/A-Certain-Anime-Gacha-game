import { NextResponse } from "next/server";
import { ensureAdventure, getGameState, performAction } from "@/lib/game";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await ensureAdventure();
    return NextResponse.json({ state: await getGameState(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Game state error:", error);
    return NextResponse.json({ error: "We couldn't connect to your adventure. Please try again." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    const body = await request.json();
    if (!body || typeof body.type !== "string") return NextResponse.json({ error: "Please choose a valid action." }, { status: 400 });
    return NextResponse.json(await performAction(user.id, body));
  } catch (error) {
    console.error("Game action error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return NextResponse.json({ error: message.startsWith("Failed query") ? "We couldn't save this update. Please try again." : message }, { status: 400 });
  }
}
