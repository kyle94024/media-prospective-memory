import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, studyId, platformMostUsed, platformUsedDuring, dailyUsage, condition, freeResponse } = body;

    await initializeDatabase();
    const sql = getDb();

    await sql`
      INSERT INTO survey_responses (participant_id, study_id, platform_most_used, platform_used_during, daily_usage, condition, free_response)
      VALUES (${participantId || "anonymous"}, ${studyId || null}, ${platformMostUsed || null}, ${platformUsedDuring || null}, ${dailyUsage || null}, ${condition || null}, ${freeResponse || null})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving survey:", error);
    return NextResponse.json(
      { error: "Failed to save survey" },
      { status: 500 }
    );
  }
}
