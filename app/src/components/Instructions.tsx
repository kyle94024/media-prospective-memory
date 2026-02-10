"use client";

import { TaskType, PM_CUES } from "@/lib/types";

interface InstructionsProps {
  taskType: TaskType;
  onContinue: () => void;
}

export default function Instructions({ taskType, onContinue }: InstructionsProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <div className="max-w-2xl w-full space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-neutral-400 dark:text-neutral-500 text-sm uppercase tracking-widest">
            Instructions
          </div>
          <h1 className="text-3xl font-light text-neutral-900 dark:text-white">
            {taskType === "LD"
              ? "Lexical Decision Task"
              : "Prospective Memory Task"}
          </h1>
        </div>

        {/* LD Instructions */}
        <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-7">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
              Lexical Decision
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[15px]">
              You will see a string of letters appear on the screen. Your task is to
              decide as quickly and accurately as possible whether the string is a{" "}
              <span className="text-neutral-900 dark:text-white font-semibold">real English word</span> or a{" "}
              <span className="text-neutral-900 dark:text-white font-semibold">non-word</span>.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-5 text-center">
              <kbd className="inline-block px-5 py-2.5 bg-white dark:bg-neutral-700 rounded-lg text-neutral-800 dark:text-white font-mono text-lg mb-3 border border-neutral-200 dark:border-neutral-600 shadow-sm">
                N
              </kbd>
              <div className="text-sm font-medium text-neutral-700 dark:text-neutral-400">Real Word</div>
              <div className="text-xs text-neutral-400 dark:text-neutral-600 mt-1.5">e.g., KITCHEN</div>
            </div>
            <div className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-5 text-center">
              <kbd className="inline-block px-5 py-2.5 bg-white dark:bg-neutral-700 rounded-lg text-neutral-800 dark:text-white font-mono text-lg mb-3 border border-neutral-200 dark:border-neutral-600 shadow-sm">
                M
              </kbd>
              <div className="text-sm font-medium text-neutral-700 dark:text-neutral-400">Non-word</div>
              <div className="text-xs text-neutral-400 dark:text-neutral-600 mt-1.5">e.g., KITCHAN</div>
            </div>
          </div>
        </div>

        {/* PM Instructions */}
        {taskType === "PM" && (
          <div className="bg-white dark:bg-neutral-900/50 border border-violet-200 dark:border-violet-900/30 rounded-2xl p-9 space-y-7">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
                Prospective Memory Component
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[15px]">
                In addition to the lexical decision task, you must{" "}
                <span className="text-neutral-900 dark:text-white font-semibold">
                  remember to press a special key
                </span>{" "}
                whenever one of the following color words appears on screen.{" "}
                <span className="text-violet-600 dark:text-violet-400 font-medium">
                  Instead of pressing N or M, press the designated key below:
                </span>
              </p>
            </div>

            <div className="flex gap-5">
              {PM_CUES.map((cue) => (
                <div
                  key={cue.key}
                  className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-5 text-center border"
                  style={{ borderColor: `${cue.color}33` }}
                >
                  <kbd
                    className="inline-block px-5 py-2.5 rounded-lg font-mono text-lg mb-3 border"
                    style={{
                      color: cue.color,
                      backgroundColor: `${cue.color}12`,
                      borderColor: `${cue.color}35`,
                    }}
                  >
                    {cue.key.toUpperCase()}
                  </kbd>
                  <div className="text-sm font-semibold" style={{ color: cue.color }}>
                    {cue.word}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-neutral-500 text-sm leading-relaxed">
              These color words will appear occasionally among the regular stimuli.
              You must remember to press the correct key when you see them.
            </p>
          </div>
        )}

        {/* Timing info */}
        <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Timing
          </h3>
          <ul className="text-neutral-600 dark:text-neutral-500 text-sm space-y-3 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              Each stimulus appears for a maximum of 3 seconds
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              A fixation cross (+) will appear before each stimulus
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              Respond as quickly and accurately as possible
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              You will start with a short practice round
            </li>
          </ul>
        </div>

        {/* Continue button */}
        <div className="text-center pt-2">
          <button
            onClick={onContinue}
            className="px-10 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                       hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 text-lg"
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
}
