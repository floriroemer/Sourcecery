import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Clerk webhook — syncs user data into our Neon database.
 * Handles user.created, user.updated, user.deleted events.
 *
 * Requires CLERK_WEBHOOK_SECRET env var (set in Clerk Dashboard → Webhooks).
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const headerPayload = await req.headers;
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const firstName = data.first_name ?? null;
      const lastName = data.last_name ?? null;
      const imageUrl = data.image_url ?? null;

      await db
        .insert(users)
        .values({ clerkId, email, firstName, lastName, imageUrl })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { email, firstName, lastName, imageUrl, updatedAt: new Date() },
        });
    } else if (eventType === "user.deleted") {
      const clerkId = data.id;
      if (clerkId) {
        await db.delete(users).where(eq(users.clerkId, clerkId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}