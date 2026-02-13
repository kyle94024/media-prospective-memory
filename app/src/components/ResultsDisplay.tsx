"use client";

import { TrialResult, TaskType, Phase } from "@/lib/types";
import { useRouter } from "next/navigation";

interface ResultsDisplayProps {
  results: TrialResult[];
  taskType: TaskType;
  phase: Phase;
  isExperiment?: boolean;
  homePath?: string;
  nextUrl?: string;
}

export default function ResultsDisplay({
  results,
  taskType,
  phase,
  isExperiment = false,
  homePath = "/",
  nextUrl,
}: ResultsDisplayProps) {
  const router = useRouter();

  const ldTrials = results.filter(
    (r) => r.stimulusType === "word" || r.stimulusType === "nonword"
  );
  const pmTrials = results.filter((r) => r.stimulusType === "pm_cue");

  const ldCorrect = ldTrials.filter((r) => r.correct).length;
  const ldAccuracy = ldTrials.length > 0 ? (ldCorrect / ldTrials.length) * 100 : 0;

  const ldSuccessful = ldTrials.filter((r) => r.success && r.reactionTime !== null);
  const ldAvgRT =
    ldSuccessful.length > 0
      ? ldSuccessful.reduce((sum, r) => sum + (r.reactionTime || 0), 0) / ldSuccessful.length
      : 0;

  const pmCorrect = pmTrials.filter((r) => r.correct).length;
  const pmAccuracy = pmTrials.length > 0 ? (pmCorrect / pmTrials.length) * 100 : 0;

  const pmSuccessful = pmTrials.filter((r) => r.success && r.reactionTime !== null);
  const pmAvgRT =
    pmSuccessful.length > 0
      ? pmSuccessful.reduce((sum, r) => sum + (r.reactionTime || 0), 0) / pmSuccessful.length
      : 0;

  const totalCorrect = results.filter((r) => r.correct).length;
  const totalAccuracy = results.length > 0 ? (totalCorrect / results.length) * 100 : 0;

  const wordTrials = results.filter((r) => r.stimulusType === "word");
  const wordAccuracy = wordTrials.length > 0
    ? (wordTrials.filter((r) => r.correct).length / wordTrials.length) * 100
    : 0;

  const nonwordTrials = results.filter((r) => r.stimulusType === "nonword");
  const nonwordAccuracy = nonwordTrials.length > 0
    ? (nonwordTrials.filter((r) => r.correct).length / nonwordTrials.length) * 100
    : 0;

  const taskLabel = isExperiment
    ? (phase === "before" ? "Task 1" : "Task 2")
    : (taskType === "PM" ? "Prospective Memory" : "Lexical Decision");
  const phaseLabel = isExperiment
    ? (phase === "before" ? "Part A" : "Part B")
    : (phase === "before" ? "Pre" : "Post") + "-Interruption";

  const ldHeading = isExperiment ? "Classification" : "Lexical Decision";
  const pmHeading = isExperiment ? "Special Cues" : "Prospective Memory";
  const pmAccLabel = isExperiment ? "Cue Accuracy" : "PM Accuracy";
  const pmRtLabel = isExperiment ? "Avg. Cue Reaction Time" : "Avg. PM Reaction Time";

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 py-14 transition-colors duration-200">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-emerald-500 text-sm uppercase tracking-widest mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isExperiment ? "Complete" : "Task Complete"}
          </div>
          <h1 className="text-3xl font-light text-neutral-900 dark:text-white">Results</h1>
          <p className="text-neutral-500 text-base">
            {taskLabel} &mdash; {phaseLabel}
          </p>
        </div>

        {/* Overall accuracy card */}
        <div className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center">
          <div className="text-6xl font-light text-neutral-900 dark:text-white mb-3">
            {totalAccuracy.toFixed(1)}%
          </div>
          <div className="text-neutral-500 text-base">Overall Accuracy</div>
          <div className="text-neutral-400 dark:text-neutral-600 text-sm mt-1.5">
            {totalCorrect} / {results.length} correct
          </div>
        </div>

        {/* Detailed stats */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 space-y-5">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {ldHeading}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {ldAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">
                  Accuracy ({ldCorrect}/{ldTrials.length})
                </div>
              </div>
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {ldAvgRT.toFixed(0)}
                  <span className="text-sm text-neutral-400 dark:text-neutral-600 ml-1">ms</span>
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Avg. Reaction Time</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 space-y-5">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {wordAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Word Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {nonwordAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Non-word Accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* PM Stats */}
        {taskType === "PM" && pmTrials.length > 0 && (
          <div className="bg-white dark:bg-neutral-900/50 border border-violet-200 dark:border-violet-900/30 rounded-2xl p-7 space-y-5">
            <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              {pmHeading}
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {pmAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">
                  {pmAccLabel} ({pmCorrect}/{pmTrials.length})
                </div>
              </div>
              <div>
                <div className="text-3xl font-light text-neutral-900 dark:text-white">
                  {pmAvgRT.toFixed(0)}
                  <span className="text-sm text-neutral-400 dark:text-neutral-600 ml-1">ms</span>
                </div>
                <div className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">{pmRtLabel}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-5">
              {["BLUE", "PURPLE", "GREEN"].map((cue) => {
                const cueTrials = pmTrials.filter((r) => r.stimulus === cue);
                const cueCorrect = cueTrials.filter((r) => r.correct).length;
                const colors: Record<string, string> = {
                  BLUE: "#3B82F6",
                  PURPLE: "#8B5CF6",
                  GREEN: "#22C55E",
                };
                return (
                  <div
                    key={cue}
                    className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 text-center"
                  >
                    <div className="text-sm font-semibold mb-1.5" style={{ color: colors[cue] }}>
                      {cue}
                    </div>
                    <div className="text-xl font-medium text-neutral-800 dark:text-white">
                      {cueTrials.length > 0 ? `${cueCorrect}/${cueTrials.length}` : "N/A"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeout stats */}
        <div className="bg-white/60 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/50 rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 text-sm">Timeouts (no response)</span>
            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
              {results.filter((r) => !r.success).length} / {results.length}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          {!nextUrl && (
            <button
              onClick={() => router.push(homePath)}
              className="px-8 py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-white rounded-full font-semibold
                         hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-200 border border-neutral-200 dark:border-neutral-700"
            >
              Back to Home
            </button>
          )}
          {nextUrl && (
            <button
              onClick={() => router.push(nextUrl)}
              className="px-10 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                         hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200
                         shadow-lg shadow-neutral-900/15 dark:shadow-white/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
