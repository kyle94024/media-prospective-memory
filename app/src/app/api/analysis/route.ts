import { NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const sql = getDb();

    const [sessions, trials, surveys] = await Promise.all([
      sql`SELECT * FROM sessions ORDER BY created_at DESC`,
      sql`SELECT * FROM trials ORDER BY session_id, trial_index`,
      sql`SELECT * FROM survey_responses ORDER BY created_at DESC`,
    ]);

    return NextResponse.json({ sessions, trials, surveys });
  } catch (error) {
    console.error("Error fetching analysis data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis data" },
      { status: 500 }
    );
  }
}
