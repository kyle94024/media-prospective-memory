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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-3 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-[0.25em] mb-4">
            <div className="w-10 h-px bg-neutral-300 dark:bg-neutral-700" />
            Cognitive Study
            <div className="w-10 h-px bg-neutral-300 dark:bg-neutral-700" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-900 dark:text-white">
            Prospective Memory
            <span className="block text-neutral-400 dark:text-neutral-500 text-2xl md:text-3xl mt-3 font-extralight">
              & Lexical Decision
            </span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-500 max-w-lg mx-auto text-sm leading-relaxed mt-6">
            Based on{" "}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-neutral-600 dark:text-neutral-400 underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700 hover:text-neutral-900 dark:hover:text-white hover:decoration-neutral-500 dark:hover:decoration-neutral-400 transition-all duration-200"
            >
              Chiossi et al. (CHI 2023)
            </button>
            &mdash; investigating the impact of social media interruptions on
            prospective memory.
          </p>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="max-w-xl w-full mb-12 bg-white/90 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-4 backdrop-blur-md shadow-lg shadow-neutral-900/5 dark:shadow-black/20">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">About This Study</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors duration-200 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
        <div className="max-w-xl w-full space-y-10">
          {/* Participant ID */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-8 shadow-sm shadow-neutral-900/[0.04] dark:shadow-none transition-shadow duration-300">
            <label className="block text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
              Participant ID
              <span className="text-neutral-400 dark:text-neutral-600 font-normal normal-case tracking-normal ml-2 text-sm lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Enter your ID..."
              className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl px-5 py-4
                         text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600
                         focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 focus:bg-white dark:focus:bg-neutral-800/80
                         transition-all duration-200 text-[15px]"
            />
          </div>

          {/* Task Type Selection */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-8 space-y-6 shadow-sm shadow-neutral-900/[0.04] dark:shadow-none transition-shadow duration-300">
            <h2 className="text-[13px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              Select Task
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => setTaskType("LD")}
                className={`group relative p-7 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                  ${
                    taskType === "LD"
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-500/10 shadow-md shadow-blue-500/10 dark:shadow-blue-500/5 scale-[1.01]"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/[0.06] dark:hover:shadow-black/20 hover:bg-white dark:hover:bg-neutral-800/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase">LD</span>
                    {taskType === "LD" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
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
                className={`group relative p-7 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                  ${
                    taskType === "PM"
                      ? "border-violet-500 bg-violet-50/80 dark:bg-violet-500/10 shadow-md shadow-violet-500/10 dark:shadow-violet-500/5 scale-[1.01]"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/[0.06] dark:hover:shadow-black/20 hover:bg-white dark:hover:bg-neutral-800/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase">PM</span>
                    {taskType === "PM" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-violet-500/20" />
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
                        className="text-xs px-2.5 py-1 rounded-md font-medium"
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
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-8 space-y-6 shadow-sm shadow-neutral-900/[0.04] dark:shadow-none transition-shadow duration-300">
            <h2 className="text-[13px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              Select Phase
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => setPhase("before")}
                className={`group relative p-7 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                  ${
                    phase === "before"
                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 shadow-md shadow-amber-500/10 dark:shadow-amber-500/5 scale-[1.01]"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/[0.06] dark:hover:shadow-black/20 hover:bg-white dark:hover:bg-neutral-800/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">PRE</span>
                    {phase === "before" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
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
                className={`group relative p-7 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                  ${
                    phase === "after"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10 dark:shadow-emerald-500/5 scale-[1.01]"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md hover:shadow-neutral-900/[0.06] dark:hover:shadow-black/20 hover:bg-white dark:hover:bg-neutral-800/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">POST</span>
                    {phase === "after" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
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
          <div className="pt-3">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`w-full py-5 rounded-2xl font-semibold text-lg transition-all duration-300 tracking-wide
                ${
                  canStart
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xl shadow-neutral-900/15 dark:shadow-white/10 hover:shadow-2xl hover:shadow-neutral-900/20 dark:hover:shadow-white/15 hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                }`}
            >
              {canStart ? "Begin Experiment" : "Select task and phase to continue"}
            </button>
          </div>

          {/* Study flow diagram */}
          <div className="bg-white/80 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/60 rounded-2xl p-8 shadow-sm shadow-neutral-900/[0.03] dark:shadow-none">
            <h3 className="text-[13px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-7 flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              Experiment Flow
            </h3>
            <div className="flex items-center justify-between text-xs">
              <div className={`flex flex-col items-center gap-2.5 transition-colors duration-200 ${phase === "before" ? "text-amber-500" : "text-neutral-400 dark:text-neutral-600"}`}>
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all duration-200
                  ${phase === "before" ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-md shadow-amber-500/15" : "border-neutral-300 dark:border-neutral-700"}`}>
                  1
                </div>
                <span className="font-medium">Before</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-700 mx-4" />
              <div className="flex flex-col items-center gap-2.5 text-neutral-400 dark:text-neutral-600">
                <div className="w-12 h-12 rounded-full border-2 border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium">10 min break</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-700 mx-4" />
              <div className={`flex flex-col items-center gap-2.5 transition-colors duration-200 ${phase === "after" ? "text-emerald-500" : "text-neutral-400 dark:text-neutral-600"}`}>
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all duration-200
                  ${phase === "after" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/15" : "border-neutral-300 dark:border-neutral-700"}`}>
                  2
                </div>
                <span className="font-medium">After</span>
              </div>
            </div>
            <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-7 text-center leading-relaxed">
              Complete &ldquo;Before&rdquo;, take a break with or without social media, then complete &ldquo;After&rdquo;
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-neutral-400 dark:text-neutral-700 text-xs tracking-wide">
          <p>
            Reconstructed from Chiossi et al. (2023) &mdash; CHI &apos;23
          </p>
        </div>
      </div>
    </div>
  );
}
