const { Pool } = require("@neondatabase/serverless");

const pool = new Pool({
  connectionString: process.env.NEON_Connection_String,
});

async function main() {
  const res = await pool.query(
    `UPDATE users SET enabled_models = '["openai/gpt-4.1","anthropic/claude-sonnet-4.5"]'::jsonb`
  );
  console.log(`Reset enabled_models for ${res.rowCount} users`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  pool.end();
});