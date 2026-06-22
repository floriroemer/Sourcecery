import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon serverless connection pool for use in server components,
 * server actions, and route handlers.
 *
 * Uses the pooled connection string from env for efficient connection reuse.
 */
const pool = new Pool({
  connectionString: process.env.NEON_Connection_String,
});

export const db = drizzle(pool, { schema });
export { schema };