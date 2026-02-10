"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TaskType, Phase, TrialResult } from "@/lib/types";
import Instructions from "@/components/Instructions";
import TaskRunner from "@/components/TaskRunner";
import ResultsDisplay from "@/components/ResultsDisplay";

type TaskPhase =
  | "instructions"
  | "training"
  | "training_complete"
  | "main_task"
  | "results";

function TaskContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const taskType = (searchParams.get("task") as TaskType) || "LD";
  const phase = (searchParams.get("phase") as Phase) || "before";
  const participantId = searchParams.get("pid") || "anonymous";

  const [currentPhase, setCurrentPhase] = useState<TaskPhase>("instructions");
  const [sessionId] = useState(
    () => `${taskType}-${phase}-${participantId}-${Date.now()}`
  );
  const [results, setResults] = useState<TrialResult[]>([]);
  const [saving, setSaving] = useState(false);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionId,
            participantId,
            taskType,
            phase,
            startedAt: Date.now(),
          }),
        });
      } catch (e) {
        // DB may not be configured; continue anyway
        console.warn("Could not create session:", e);
      }
    };
    createSession();
  }, [sessionId, participantId, taskType, phase]);

  const saveResults = useCallback(
    async (trialResults: TrialResult[]) => {
      setSaving(true);
      try {
        // Save trials
        await fetch("/api/trials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trials: trialResults }),
        });

        // Mark session complete
        await fetch("/api/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionId,
            completedAt: Date.now(),
          }),
        });
      } catch (e) {
        console.warn("Could not save results:", e);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  const handleTrainingComplete = useCallback(() => {
    setCurrentPhase("training_complete");
  }, []);

  const handleMainTaskComplete = useCallback(
    async (trialResults: TrialResult[]) => {
      setResults(trialResults);
      await saveResults(trialResults);
      setCurrentPhase("results");
    },
    [saveResults]
  );

  // Validate params
  if (!["LD", "PM"].includes(taskType) || !["before", "after"].includes(phase)) {
    router.push("/");
    return null;
  }

  switch (currentPhase) {
    case "instructions":
      return (
        <Instructions
          taskType={taskType}
          onContinue={() => setCurrentPhase("training")}
        />
      );

    case "training":
      return (
        <TaskRunner
          taskType={taskType}
          phase={phase}
          sessionId={`${sessionId}-training`}
          onComplete={handleTrainingComplete}
          isTraining={true}
        />
      );

    case "training_complete":
      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-950">
          <div className="text-center space-y-6 max-w-lg px-4">
            <div className="text-emerald-400 text-sm uppercase tracking-widest">
              Practice Complete
            </div>
            <h2 className="text-2xl font-light text-white">
              Ready for the main task?
            </h2>
            <p className="text-neutral-500 leading-relaxed">
              The main task is the same as practice, but without feedback.
              Remember to respond as quickly and accurately as possible.
              {taskType === "PM" && (
                <span className="block mt-2 text-violet-400">
                  Don&apos;t forget to press the special keys when color words appear!
                </span>
              )}
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => setCurrentPhase("training")}
                className="px-6 py-3 bg-neutral-800 text-white rounded-full font-medium
                           hover:bg-neutral-700 transition-colors border border-neutral-700"
              >
                Practice Again
              </button>
              <button
                onClick={() => setCurrentPhase("main_task")}
                className="px-8 py-3 bg-white text-neutral-950 rounded-full font-medium
                           hover:bg-neutral-200 transition-colors"
              >
                Start Main Task
              </button>
            </div>
          </div>
        </div>
      );

    case "main_task":
      return (
        <TaskRunner
          taskType={taskType}
          phase={phase}
          sessionId={sessionId}
          onComplete={handleMainTaskComplete}
        />
      );

    case "results":
      if (saving) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-950">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full mx-auto" />
              <div className="text-neutral-400">Saving results...</div>
            </div>
          </div>
        );
      }
      return (
        <ResultsDisplay results={results} taskType={taskType} phase={phase} />
      );
  }
}

export default function TaskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-neutral-950">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <TaskContent />
    </Suspense>
  );
}
