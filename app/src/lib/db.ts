import { neon } from "@neondatabase/serverless";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      task_type TEXT NOT NULL CHECK (task_type IN ('LD', 'PM')),
      phase TEXT NOT NULL CHECK (phase IN ('before', 'after')),
      started_at BIGINT NOT NULL,
      completed_at BIGINT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS trials (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      trial_index INTEGER NOT NULL,
      stimulus TEXT NOT NULL,
      stimulus_type TEXT NOT NULL CHECK (stimulus_type IN ('word', 'nonword', 'pm_cue')),
      expected_key TEXT NOT NULL,
      pressed_key TEXT,
      correct BOOLEAN NOT NULL,
      reaction_time REAL,
      success BOOLEAN NOT NULL,
      fixation_duration INTEGER NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_trials_session ON trials(session_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id SERIAL PRIMARY KEY,
      participant_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      daily_usage TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}
