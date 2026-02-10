"use client";

import { TrialResult, TaskType, Phase } from "@/lib/types";
import { useRouter } from "next/navigation";

interface ResultsDisplayProps {
  results: TrialResult[];
  taskType: TaskType;
  phase: Phase;
}

export default function ResultsDisplay({
  results,
  taskType,
  phase,
}: ResultsDisplayProps) {
  const router = useRouter();

  // Calculate stats
  const ldTrials = results.filter(
    (r) => r.stimulusType === "word" || r.stimulusType === "nonword"
  );
  const pmTrials = results.filter((r) => r.stimulusType === "pm_cue");

  const ldCorrect = ldTrials.filter((r) => r.correct).length;
  const ldAccuracy = ldTrials.length > 0 ? (ldCorrect / ldTrials.length) * 100 : 0;

  const ldSuccessful = ldTrials.filter((r) => r.success && r.reactionTime !== null);
  const ldAvgRT =
    ldSuccessful.length > 0
      ? ldSuccessful.reduce((sum, r) => sum + (r.reactionTime || 0), 0) /
        ldSuccessful.length
      : 0;

  const pmCorrect = pmTrials.filter((r) => r.correct).length;
  const pmAccuracy = pmTrials.length > 0 ? (pmCorrect / pmTrials.length) * 100 : 0;

  const pmSuccessful = pmTrials.filter((r) => r.success && r.reactionTime !== null);
  const pmAvgRT =
    pmSuccessful.length > 0
      ? pmSuccessful.reduce((sum, r) => sum + (r.reactionTime || 0), 0) /
        pmSuccessful.length
      : 0;

  const totalCorrect = results.filter((r) => r.correct).length;
  const totalAccuracy = results.length > 0 ? (totalCorrect / results.length) * 100 : 0;

  const wordTrials = results.filter((r) => r.stimulusType === "word");
  const wordAccuracy = wordTrials.length > 0
    ? (wordTrials.filter(r => r.correct).length / wordTrials.length) * 100
    : 0;

  const nonwordTrials = results.filter((r) => r.stimulusType === "nonword");
  const nonwordAccuracy = nonwordTrials.length > 0
    ? (nonwordTrials.filter(r => r.correct).length / nonwordTrials.length) * 100
    : 0;

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-sm uppercase tracking-widest mb-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Task Complete
          </div>
          <h1 className="text-3xl font-light text-white">Results</h1>
          <p className="text-neutral-500">
            {taskType === "PM" ? "Prospective Memory" : "Lexical Decision"} Task
            &mdash; {phase === "before" ? "Pre" : "Post"}-Interruption
          </p>
        </div>

        {/* Overall accuracy card */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center">
          <div className="text-6xl font-light text-white mb-2">
            {totalAccuracy.toFixed(1)}%
          </div>
          <div className="text-neutral-500">Overall Accuracy</div>
          <div className="text-neutral-600 text-sm mt-1">
            {totalCorrect} / {results.length} correct
          </div>
        </div>

        {/* Detailed stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* LD Stats */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Lexical Decision
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-light text-white">
                  {ldAccuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-neutral-600">
                  Accuracy ({ldCorrect}/{ldTrials.length})
                </div>
              </div>
              <div>
                <div className="text-2xl font-light text-white">
                  {ldAvgRT.toFixed(0)}
                  <span className="text-sm text-neutral-600 ml-1">ms</span>
                </div>
                <div className="text-xs text-neutral-600">Avg. Reaction Time</div>
              </div>
            </div>
          </div>

          {/* Word vs Nonword breakdown */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-light text-white">
                  {wordAccuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-neutral-600">
                  Word Accuracy
                </div>
              </div>
              <div>
                <div className="text-2xl font-light text-white">
                  {nonwordAccuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-neutral-600">Non-word Accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* PM Stats (if PM task) */}
        {taskType === "PM" && pmTrials.length > 0 && (
          <div className="bg-neutral-900/50 border border-violet-900/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-violet-400 uppercase tracking-wider">
              Prospective Memory
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-light text-white">
                  {pmAccuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-neutral-600">
                  PM Accuracy ({pmCorrect}/{pmTrials.length})
                </div>
              </div>
              <div>
                <div className="text-3xl font-light text-white">
                  {pmAvgRT.toFixed(0)}
                  <span className="text-sm text-neutral-600 ml-1">ms</span>
                </div>
                <div className="text-xs text-neutral-600">
                  Avg. PM Reaction Time
                </div>
              </div>
            </div>

            {/* PM Cue breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {["BLUE", "PURPLE", "GREEN"].map((cue) => {
                const cueTrials = pmTrials.filter(
                  (r) => r.stimulus === cue
                );
                const cueCorrect = cueTrials.filter((r) => r.correct).length;
                const colors: Record<string, string> = {
                  BLUE: "#3B82F6",
                  PURPLE: "#8B5CF6",
                  GREEN: "#22C55E",
                };
                return (
                  <div
                    key={cue}
                    className="bg-neutral-800/50 rounded-xl p-3 text-center"
                  >
                    <div
                      className="text-sm font-medium mb-1"
                      style={{ color: colors[cue] }}
                    >
                      {cue}
                    </div>
                    <div className="text-lg text-white">
                      {cueTrials.length > 0
                        ? `${cueCorrect}/${cueTrials.length}`
                        : "N/A"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeout stats */}
        <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 text-sm">Timeouts (no response)</span>
            <span className="text-neutral-400">
              {results.filter((r) => !r.success).length} / {results.length}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-neutral-800 text-white rounded-full font-medium
                       hover:bg-neutral-700 transition-colors duration-200 border border-neutral-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
