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
  const isExperiment = searchParams.get("mode") === "experiment";
  const experimentStep = parseInt(searchParams.get("step") || "0");
  const trainingOnly = searchParams.get("trainingOnly") === "true";
  const skipTraining = searchParams.get("skipTraining") === "true";

  const [currentPhase, setCurrentPhase] = useState<TaskPhase>(
    skipTraining ? "main_task" : "instructions"
  );
  const [sessionId] = useState(
    () => `${taskType}-${phase}-${participantId}-${Date.now()}`
  );
  const [results, setResults] = useState<TrialResult[]>([]);
  const [saving, setSaving] = useState(false);

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
        console.warn("Could not create session:", e);
      }
    };
    createSession();
  }, [sessionId, participantId, taskType, phase]);

  const saveResults = useCallback(
    async (trialResults: TrialResult[]) => {
      setSaving(true);
      try {
        await fetch("/api/trials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trials: trialResults }),
        });
        await fetch("/api/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId, completedAt: Date.now() }),
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

  if (!["LD", "PM"].includes(taskType) || !["before", "after"].includes(phase)) {
    router.push("/");
    return null;
  }

  const taskLabel = isExperiment
    ? "Task"
    : (taskType === "PM" ? "Prospective Memory" : "Lexical Decision");

  const homePath = isExperiment ? "/experiment" : "/";
  const nextExperimentUrl = isExperiment
    ? `/experiment?step=${experimentStep + 1}&pid=${encodeURIComponent(participantId)}`
    : undefined;

  switch (currentPhase) {
    case "instructions":
      return (
        <Instructions
          taskType={taskType}
          isExperiment={isExperiment}
          onContinue={() => setCurrentPhase("training")}
        />
      );

    case "training":
      return (
        <TaskRunner
          taskType={taskType}
          phase={phase}
          sessionId={`${sessionId}-training`}
          isExperiment={isExperiment}
          onComplete={handleTrainingComplete}
          isTraining={true}
        />
      );

    case "training_complete":
      return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
          <div className="text-center space-y-8 max-w-lg px-4">
            <div className="text-emerald-500 text-sm uppercase tracking-widest font-medium">
              Practice Complete
            </div>
            <h2 className="text-3xl font-light text-neutral-900 dark:text-white">
              {trainingOnly ? "Nice work!" : "Ready for the main task?"}
            </h2>
            <p className="text-neutral-500 leading-relaxed text-base">
              {trainingOnly ? (
                "You\u2019ve completed this practice round. Let\u2019s continue to the next step."
              ) : (
                <>
                  The main task is the same as practice, but without feedback.
                  Remember to respond as quickly and accurately as possible.
                  {taskType === "PM" && (
                    <span className="block mt-3 text-violet-600 dark:text-violet-400 font-medium">
                      Don&apos;t forget to press the special keys when color words appear!
                    </span>
                  )}
                </>
              )}
            </p>
            <div className="flex gap-4 justify-center pt-2">
              <button
                onClick={() => setCurrentPhase("training")}
                className="px-7 py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-white rounded-full font-semibold
                           hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                Practice Again
              </button>
              {trainingOnly && nextExperimentUrl ? (
                <button
                  onClick={() => router.push(nextExperimentUrl)}
                  className="px-9 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                             hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => setCurrentPhase("main_task")}
                  className="px-9 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                             hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Start {isExperiment ? taskLabel : "Main Task"}
                </button>
              )}
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
          isExperiment={isExperiment}
          onComplete={handleMainTaskComplete}
        />
      );

    case "results":
      if (saving) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
            <div className="text-center space-y-5">
              <div className="animate-spin w-8 h-8 border-2 border-neutral-200 dark:border-neutral-600 border-t-neutral-600 dark:border-t-white rounded-full mx-auto" />
              <div className="text-neutral-500 dark:text-neutral-400">Saving results...</div>
            </div>
          </div>
        );
      }
      if (isExperiment) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
            <div className="text-center space-y-8 max-w-lg px-4">
              <div className="inline-flex items-center gap-2 text-emerald-500 text-sm uppercase tracking-widest">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Section Complete
              </div>
              <h2 className="text-3xl font-light text-neutral-900 dark:text-white">
                Nice work!
              </h2>
              <p className="text-neutral-500 text-base">
                Your responses have been recorded. Let&apos;s continue to the next part.
              </p>
              {nextExperimentUrl && (
                <button
                  onClick={() => router.push(nextExperimentUrl)}
                  className="px-10 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                             hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200"
                >
                  Continue
                </button>
              )}
              {!nextExperimentUrl && (
                <button
                  onClick={() => router.push(homePath)}
                  className="px-10 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                             hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        );
      }
      return (
        <ResultsDisplay results={results} taskType={taskType} phase={phase} isExperiment={isExperiment} homePath={homePath} nextUrl={nextExperimentUrl} />
      );
  }
}

export default function TaskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <TaskContent />
    </Suspense>
  );
}
