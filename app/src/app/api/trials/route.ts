import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trials } = body;

    if (!Array.isArray(trials) || trials.length === 0) {
      return NextResponse.json(
        { error: "No trials provided" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Batch insert trials
    for (const trial of trials) {
      await sql`
        INSERT INTO trials (
          session_id, trial_index, stimulus, stimulus_type,
          expected_key, pressed_key, correct, reaction_time,
          success, fixation_duration, timestamp
        ) VALUES (
          ${trial.sessionId},
          ${trial.trialIndex},
          ${trial.stimulus},
          ${trial.stimulusType},
          ${trial.expectedKey},
          ${trial.pressedKey},
          ${trial.correct},
          ${trial.reactionTime},
          ${trial.success},
          ${trial.fixationDuration},
          ${trial.timestamp}
        )
      `;
    }

    return NextResponse.json({ success: true, count: trials.length });
  } catch (error) {
    console.error("Error saving trials:", error);
    return NextResponse.json(
      { error: "Failed to save trials" },
      { status: 500 }
    );
  }
}
