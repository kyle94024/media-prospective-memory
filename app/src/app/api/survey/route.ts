import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, platform, dailyUsage } = body;

    if (!platform || !dailyUsage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await initializeDatabase();
    const sql = getDb();

    await sql`
      INSERT INTO survey_responses (participant_id, platform, daily_usage)
      VALUES (${participantId || "anonymous"}, ${platform}, ${dailyUsage})
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
