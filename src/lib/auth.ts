import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

/**
 * Get the current user's database record, keyed by Clerk ID.
 * Returns null if not signed in or not yet synced to the DB.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user ?? null;
}

/**
 * Get the current user's DB ID, creating the record if it doesn't exist yet
 * (handles the case where the webhook hasn't fired yet).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  const clerkId = session?.userId;
  if (!clerkId) return null;

  // Try to find existing
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing) return existing.id;

  // Create on-demand if missing (webhook may not have fired yet)
  // Extract email and name from Clerk session claims
  const claims = session?.sessionClaims as Record<string, any> | undefined;
  const email =
    claims?.email ??
    (session as any)?.sessionClaims?.email_address ??
    "";
  const firstName =
    claims?.given_name ??
    (session as any)?.sessionClaims?.given_name ??
    null;
  const lastName =
    claims?.family_name ??
    (session as any)?.sessionClaims?.family_name ??
    null;
  const imageUrl = (session as any)?.sessionClaims?.image_url ?? null;

  const [created] = await db
    .insert(users)
    .values({ clerkId, email, firstName, lastName, imageUrl })
    .returning({ id: users.id });

  return created?.id ?? null;
}