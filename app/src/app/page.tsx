"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskType, Phase, PM_CUES } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<TaskType | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [participantId, setParticipantId] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const canStart = taskType !== null && phase !== null;

  const handleStart = () => {
    if (!canStart) return;
    const pid = participantId.trim() || "anonymous";
    router.push(`/task?task=${taskType}&phase=${phase}&pid=${encodeURIComponent(pid)}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-200">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-neutral-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Header */}
        <div className="text-center mb-14 space-y-5">
          <div className="inline-flex items-center gap-3 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-[0.2em] mb-4">
            <div className="w-8 h-px bg-neutral-300 dark:bg-neutral-700" />
            Cognitive Study
            <div className="w-8 h-px bg-neutral-300 dark:bg-neutral-700" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-900 dark:text-white">
            Prospective Memory
            <span className="block text-neutral-400 dark:text-neutral-500 text-2xl md:text-3xl mt-3 font-extralight">
              & Lexical Decision
            </span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-500 max-w-lg mx-auto text-sm leading-relaxed mt-5">
            Based on{" "}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-neutral-600 dark:text-neutral-400 underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Chiossi et al. (CHI 2023)
            </button>
            &mdash; investigating the impact of social media interruptions on
            prospective memory.
          </p>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="max-w-xl w-full mb-10 bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 space-y-4 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">About This Study</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-neutral-500 text-sm leading-relaxed">
              This task reconstructs the experimental paradigm from
              &ldquo;Short-Form Videos Degrade Our Capacity to Retain Intentions:
              Effect of Context Switching On Prospective Memory&rdquo; (CHI &apos;23).
              The original study found that TikTok usage significantly degraded
              prospective memory performance compared to Twitter, YouTube, or rest.
            </p>
            <div className="text-neutral-400 dark:text-neutral-600 text-xs">
              Chiossi, F., Haliburton, L., Ou, C., Butz, A., & Schmidt, A. (2023)
            </div>
          </div>
        )}

        {/* Main selection card */}
        <div className="max-w-xl w-full space-y-7">
          {/* Participant ID */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7">
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
              Participant ID
              <span className="text-neutral-400 dark:text-neutral-600 font-normal ml-2">(optional)</span>
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Enter your ID..."
              className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3.5
                         text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600
                         focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600
                         transition-colors"
            />
          </div>

          {/* Task Type Selection */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 space-y-5">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Select Task
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => setTaskType("LD")}
                className={`relative p-7 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    taskType === "LD"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase">LD</span>
                    {taskType === "LD" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">
                    Lexical Decision
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Decide whether letter strings are real words or non-words
                  </p>
                </div>
              </button>

              <button
                onClick={() => setTaskType("PM")}
                className={`relative p-7 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    taskType === "PM"
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase">PM</span>
                    {taskType === "PM" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">
                    Prospective Memory
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    LD task + remember to act on special cue words
                  </p>
                  <div className="flex gap-2 mt-3">
                    {PM_CUES.map((cue) => (
                      <span
                        key={cue.word}
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          color: cue.color,
                          backgroundColor: `${cue.color}15`,
                        }}
                      >
                        {cue.word}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Phase Selection */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-7 space-y-5">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Select Phase
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => setPhase("before")}
                className={`relative p-7 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    phase === "before"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">PRE</span>
                    {phase === "before" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Before</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Pre-interruption task block
                  </p>
                </div>
              </button>

              <button
                onClick={() => setPhase("after")}
                className={`relative p-7 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    phase === "after"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">POST</span>
                    {phase === "after" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">After</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    Post-interruption task block
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-2">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300
                ${
                  canStart
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                }`}
            >
              {canStart ? "Begin Experiment" : "Select task and phase to continue"}
            </button>
          </div>

          {/* Study flow diagram */}
          <div className="bg-white/60 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/50 rounded-2xl p-7 mt-2">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-5">
              Experiment Flow
            </h3>
            <div className="flex items-center justify-between text-xs">
              <div className={`flex flex-col items-center gap-2 ${phase === "before" ? "text-amber-500" : "text-neutral-400 dark:text-neutral-600"}`}>
                <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-semibold
                  ${phase === "before" ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" : "border-neutral-300 dark:border-neutral-700"}`}>
                  1
                </div>
                <span className="font-medium">Before</span>
              </div>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 mx-3" />
              <div className="flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-600">
                <div className="w-11 h-11 rounded-full border-2 border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium">10 min break</span>
              </div>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 mx-3" />
              <div className={`flex flex-col items-center gap-2 ${phase === "after" ? "text-emerald-500" : "text-neutral-400 dark:text-neutral-600"}`}>
                <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-semibold
                  ${phase === "after" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-neutral-300 dark:border-neutral-700"}`}>
                  2
                </div>
                <span className="font-medium">After</span>
              </div>
            </div>
            <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-5 text-center leading-relaxed">
              Complete &ldquo;Before&rdquo;, take a break with or without social media, then complete &ldquo;After&rdquo;
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-14 text-center text-neutral-400 dark:text-neutral-700 text-xs">
          <p>
            Reconstructed from Chiossi et al. (2023) &mdash; CHI &apos;23
          </p>
        </div>
      </div>
    </div>
  );
}
