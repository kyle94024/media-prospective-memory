"use client";

import { TaskType, PM_CUES } from "@/lib/types";

interface InstructionsProps {
  taskType: TaskType;
  onContinue: () => void;
}

export default function Instructions({ taskType, onContinue }: InstructionsProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 px-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-neutral-500 text-sm uppercase tracking-widest">
            Instructions
          </div>
          <h1 className="text-3xl font-light text-white">
            {taskType === "LD"
              ? "Lexical Decision Task"
              : "Prospective Memory Task"}
          </h1>
        </div>

        {/* LD Instructions */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-white mb-3">
              Lexical Decision
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              You will see a string of letters appear on the screen. Your task is to
              decide as quickly and accurately as possible whether the string is a{" "}
              <span className="text-white font-medium">real English word</span> or a{" "}
              <span className="text-white font-medium">non-word</span>.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="flex-1 bg-neutral-800/50 rounded-xl p-4 text-center">
              <kbd className="inline-block px-4 py-2 bg-neutral-700 rounded-lg text-white font-mono text-lg mb-2 border border-neutral-600">
                N
              </kbd>
              <div className="text-sm text-neutral-400">Real Word</div>
              <div className="text-xs text-neutral-600 mt-1">e.g., KITCHEN</div>
            </div>
            <div className="flex-1 bg-neutral-800/50 rounded-xl p-4 text-center">
              <kbd className="inline-block px-4 py-2 bg-neutral-700 rounded-lg text-white font-mono text-lg mb-2 border border-neutral-600">
                M
              </kbd>
              <div className="text-sm text-neutral-400">Non-word</div>
              <div className="text-xs text-neutral-600 mt-1">e.g., KITCHAN</div>
            </div>
          </div>
        </div>

        {/* PM Instructions */}
        {taskType === "PM" && (
          <div className="bg-neutral-900/50 border border-violet-900/30 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-lg font-medium text-white mb-3">
                Prospective Memory Component
              </h2>
              <p className="text-neutral-400 leading-relaxed">
                In addition to the lexical decision task, you must{" "}
                <span className="text-white font-medium">
                  remember to press a special key
                </span>{" "}
                whenever one of the following color words appears on screen.{" "}
                <span className="text-violet-400">
                  Instead of pressing N or M, press the designated key below:
                </span>
              </p>
            </div>

            <div className="flex gap-4">
              {PM_CUES.map((cue) => (
                <div
                  key={cue.key}
                  className="flex-1 bg-neutral-800/50 rounded-xl p-4 text-center border"
                  style={{ borderColor: `${cue.color}33` }}
                >
                  <kbd
                    className="inline-block px-4 py-2 rounded-lg font-mono text-lg mb-2 border"
                    style={{
                      color: cue.color,
                      backgroundColor: `${cue.color}15`,
                      borderColor: `${cue.color}40`,
                    }}
                  >
                    {cue.key.toUpperCase()}
                  </kbd>
                  <div className="text-sm font-medium" style={{ color: cue.color }}>
                    {cue.word}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-neutral-500 text-sm">
              These color words will appear occasionally among the regular stimuli.
              You must remember to press the correct key when you see them.
            </p>
          </div>
        )}

        {/* Timing info */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Timing
          </h3>
          <ul className="text-neutral-500 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-neutral-600 mt-1">&#8226;</span>
              Each stimulus appears for a maximum of 3 seconds
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-600 mt-1">&#8226;</span>
              A fixation cross (+) will appear before each stimulus
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-600 mt-1">&#8226;</span>
              Respond as quickly and accurately as possible
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-600 mt-1">&#8226;</span>
              You will start with a short practice round
            </li>
          </ul>
        </div>

        {/* Continue button */}
        <div className="text-center pt-4">
          <button
            onClick={onContinue}
            className="px-10 py-3.5 bg-white text-neutral-950 rounded-full font-medium
                       hover:bg-neutral-200 transition-colors duration-200 text-lg"
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
}
