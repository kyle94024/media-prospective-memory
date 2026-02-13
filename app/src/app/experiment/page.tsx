"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Survey from "@/components/Survey";

const BREAK_SECONDS = 10 * 60;

// Step 0: Welcome
// Step 1: Practice LD only (trainingOnly)
// Step 2: Practice PM (trainingOnly)
// Step 3: Actual PM Part A (skipTraining)
// Step 4: Break
// Step 5: Actual PM Part B (skipTraining)
// Step 6: Survey
// Step 7+: Complete
const TASK_STEPS: Record<number, { task: string; phase: string; label: string; part: string; extra: string }> = {
  1: { task: "LD", phase: "before", label: "Practice", part: "Word Classification", extra: "&trainingOnly=true" },
  2: { task: "PM", phase: "before", label: "Practice", part: "Full Task", extra: "&trainingOnly=true" },
  3: { task: "PM", phase: "before", label: "Task", part: "Part A", extra: "&skipTraining=true" },
  5: { task: "PM", phase: "after", label: "Task", part: "Part B", extra: "&skipTraining=true" },
};

function ExperimentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const step = parseInt(searchParams.get("step") || "0");
  const pid = searchParams.get("pid") || "";

  const [participantId, setParticipantId] = useState(pid);
  const [timeLeft, setTimeLeft] = useState(BREAK_SECONDS);
  const [breakDone, setBreakDone] = useState(false);

  // Break countdown timer
  useEffect(() => {
    if (step !== 4) return;
    if (timeLeft <= 0) {
      setBreakDone(true);
      return;
    }
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Auto-navigate for task steps (1, 2, 3, 5)
  useEffect(() => {
    const config = TASK_STEPS[step];
    if (config) {
      const encodedPid = encodeURIComponent(pid || "anonymous");
      router.replace(
        `/task?task=${config.task}&phase=${config.phase}&pid=${encodedPid}&mode=experiment&step=${step}${config.extra}`
      );
    }
  }, [step, pid, router]);

  const encodedPid = encodeURIComponent(participantId.trim() || "anonymous");

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-28">
          {/* Header */}
          <div className="text-center mb-24 space-y-7">
            <div className="inline-flex items-center gap-3 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-[0.25em] mb-4">
              <div className="w-12 h-px bg-neutral-300 dark:bg-neutral-700" />
              Research Study
              <div className="w-12 h-px bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <h1 className="text-5xl md:text-6xl font-light tracking-tight text-neutral-900 dark:text-white">
              Cognitive Task
            </h1>
            <p className="text-neutral-400 dark:text-neutral-500 max-w-md mx-auto text-base leading-relaxed mt-5">
              Thank you for participating. You&apos;ll start with two short practice
              rounds, then complete the main task in two sessions with a break in between.
            </p>
          </div>

          <div className="max-w-xl w-full space-y-16">
            {/* Participant ID */}
            <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-12 shadow-sm shadow-neutral-900/[0.04] dark:shadow-none">
              <label className="block text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-6">
                Participant ID
                <span className="text-neutral-400 dark:text-neutral-600 font-normal normal-case tracking-normal ml-2 text-sm lowercase">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Enter your ID..."
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl px-6 py-5
                           text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600
                           focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 focus:bg-white dark:focus:bg-neutral-800/80
                           transition-all duration-200 text-base"
              />
            </div>

            {/* Session overview */}
            <div className="bg-white/80 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800/60 rounded-2xl p-12 shadow-sm shadow-neutral-900/[0.03] dark:shadow-none">
              <h3 className="text-[13px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-10 flex items-center gap-3">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                Session Overview
              </h3>

              <div className="space-y-5">
                {[
                  { num: "", label: "Practice — Word Classification", isPractice: true },
                  { num: "", label: "Practice — Full Task (with special cues)", isPractice: true },
                  { num: "1", label: "Task — Part A" },
                  { num: "", label: "10 minute break", isBreak: true },
                  { num: "2", label: "Task — Part B" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5">
                    {item.isBreak ? (
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                        <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ) : item.isPractice ? (
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 dark:text-neutral-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold border-violet-300 dark:border-violet-800 text-violet-500">
                        {item.num}
                      </div>
                    )}
                    <span className={`text-sm font-medium ${
                      item.isBreak || item.isPractice
                        ? "text-neutral-400 dark:text-neutral-600 italic"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <button
                onClick={() => router.push(`/experiment?step=1&pid=${encodedPid}`)}
                className="w-full py-6 rounded-2xl font-semibold text-lg transition-all duration-300 tracking-wide
                  bg-neutral-900 dark:bg-white text-white dark:text-neutral-950
                  hover:bg-neutral-800 dark:hover:bg-neutral-100
                  shadow-xl shadow-neutral-900/15 dark:shadow-white/10
                  hover:shadow-2xl hover:shadow-neutral-900/20 dark:hover:shadow-white/15
                  hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
              >
                Begin Study
              </button>
            </div>
          </div>

          <div className="mt-24 text-center text-neutral-300 dark:text-neutral-800 text-xs tracking-wide">
            <p>Cognitive Research Study</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Break timer
  if (step === 4) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const progress = ((BREAK_SECONDS - timeLeft) / BREAK_SECONDS) * 100;

    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-12 max-w-md">
            <div>
              <div className="text-neutral-400 dark:text-neutral-500 text-sm uppercase tracking-widest mb-6">
                {breakDone ? "Break Complete" : "Break Time"}
              </div>
              <h2 className="text-4xl font-light text-neutral-900 dark:text-white">
                {breakDone ? "Ready to continue?" : "Take a break"}
              </h2>
            </div>

            {!breakDone && (
              <p className="text-neutral-500 text-base leading-relaxed">
                Please relax for 10 minutes. The timer will count down automatically.
              </p>
            )}

            {/* Timer display */}
            <div className="relative">
              <div className="w-48 h-48 mx-auto relative">
                {/* Background circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-neutral-200 dark:text-neutral-800" />
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="text-neutral-900 dark:text-white transition-all duration-1000"
                    stroke="currentColor" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-light tabular-nums text-neutral-900 dark:text-white">
                    {mins}:{secs.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {breakDone && (
              <p className="text-neutral-500 text-base leading-relaxed">
                Part A is complete. You&apos;ll now repeat the task for Part B.
              </p>
            )}

            <div className="pt-4">
              <button
                onClick={() => router.push(`/experiment?step=5&pid=${encodeURIComponent(pid)}`)}
                disabled={!breakDone}
                className={`px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300
                  ${breakDone
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                  }`}
              >
                {breakDone ? "Continue to Part B" : "Waiting..."}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 6: Survey
  if (step === 6) {
    return (
      <Survey
        participantId={pid || "anonymous"}
        onComplete={() => router.push(`/experiment?step=7&pid=${encodeURIComponent(pid)}`)}
      />
    );
  }

  // Step 7+: Complete
  if (step >= 7) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-10 max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-800">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-4xl font-light text-neutral-900 dark:text-white mb-4">
                Study Complete
              </h2>
              <p className="text-neutral-500 text-base leading-relaxed">
                Thank you for your participation. Your responses have been recorded.
                You may now close this window.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Task steps (1, 3): Loading while redirecting
  const config = TASK_STEPS[step];
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <div className="text-center space-y-5">
        <div className="animate-spin w-8 h-8 border-2 border-neutral-200 dark:border-neutral-600 border-t-neutral-600 dark:border-t-white rounded-full mx-auto" />
        <div className="text-neutral-500 dark:text-neutral-400">
          {config ? `Loading ${config.label} — ${config.part}...` : "Loading..."}
        </div>
      </div>
    </div>
  );
}

export default function ExperimentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <ExperimentContent />
    </Suspense>
  );
}
