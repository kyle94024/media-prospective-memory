import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, participantId, taskType, phase, startedAt } = body;

    await initializeDatabase();
    const sql = getDb();

    await sql`
      INSERT INTO sessions (id, participant_id, task_type, phase, started_at)
      VALUES (${id}, ${participantId}, ${taskType}, ${phase}, ${startedAt})
    `;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, completedAt } = body;

    const sql = getDb();

    await sql`
      UPDATE sessions SET completed_at = ${completedAt} WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
