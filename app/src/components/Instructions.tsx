"use client";

import { TaskType, PM_CUES } from "@/lib/types";

interface InstructionsProps {
  taskType: TaskType;
  isExperiment?: boolean;
  onContinue: () => void;
}

export default function Instructions({ taskType, isExperiment = false, onContinue }: InstructionsProps) {
  const taskTitle = isExperiment
    ? (taskType === "LD" ? "Task 1" : "Task 2")
    : (taskType === "LD" ? "Lexical Decision Task" : "Prospective Memory Task");

  const primaryHeading = isExperiment ? "Word Classification" : "Lexical Decision";
  const secondaryHeading = isExperiment ? "Additional Rule" : "Prospective Memory Component";

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 py-12 transition-colors duration-200">
      <div className="max-w-2xl w-full space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-neutral-400 dark:text-neutral-500 text-sm uppercase tracking-widest">
            Instructions
          </div>
          <h1 className="text-3xl font-light text-neutral-900 dark:text-white">
            {taskTitle}
          </h1>
        </div>

        {/* LD Instructions */}
        <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-7">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
              {primaryHeading}
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
                {secondaryHeading}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[15px]">
                In addition to {isExperiment ? "classifying words" : "the lexical decision task"}, you must{" "}
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
              These color words will appear occasionally among the regular {isExperiment ? "items" : "stimuli"}.
              You must remember to press the correct key when you see them.
            </p>
          </div>
        )}

        {/* Hand placement diagram */}
        <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-7">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Hand Placement
          </h3>

          <div className={`flex items-start justify-center ${taskType === "PM" ? "gap-8 md:gap-16" : "gap-6"}`}>
            {/* Left hand — PM only */}
            {taskType === "PM" && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Left Hand
                </div>
                <div className="flex flex-col items-center gap-1">
                  {/* Finger labels */}
                  <div className="flex gap-1.5 w-full">
                    {[
                      { finger: "Ring", color: PM_CUES[2].color },
                      { finger: "Mid", color: PM_CUES[1].color },
                      { finger: "Index", color: PM_CUES[0].color },
                    ].map((f) => (
                      <div key={f.finger} className="flex-1 text-center">
                        <div className="text-[10px] font-medium" style={{ color: f.color }}>{f.finger}</div>
                        <div className="mx-auto w-px h-2" style={{ backgroundColor: `${f.color}60` }} />
                      </div>
                    ))}
                  </div>
                  {/* Q W E keys */}
                  <div className="flex gap-1.5">
                    {PM_CUES.slice().reverse().map((cue) => (
                      <div
                        key={cue.key}
                        className="w-12 h-12 rounded-lg border-2 flex items-center justify-center font-mono text-base font-bold shadow-sm"
                        style={{
                          color: cue.color,
                          borderColor: `${cue.color}50`,
                          backgroundColor: `${cue.color}10`,
                        }}
                      >
                        {cue.key.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center mt-1">
                  Color-word cues
                </div>
              </div>
            )}

            {/* Divider — PM only */}
            {taskType === "PM" && (
              <div className="flex flex-col items-center gap-2 pt-6 self-stretch">
                <div className="flex-1 w-px bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800" />
                <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-medium">+</span>
                <div className="flex-1 w-px bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800" />
              </div>
            )}

            {/* Right hand */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Right Hand
              </div>
              <div className="flex flex-col items-center gap-1">
                {/* Finger labels */}
                <div className="flex gap-1.5 w-full">
                  {[
                    { finger: "Index", label: "N" },
                    { finger: "Mid", label: "M" },
                  ].map((f) => (
                    <div key={f.finger} className="flex-1 text-center">
                      <div className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">{f.finger}</div>
                      <div className="mx-auto w-px h-2 bg-neutral-300 dark:bg-neutral-700" />
                    </div>
                  ))}
                </div>
                {/* N M keys */}
                <div className="flex gap-1.5">
                  <div className="w-12 h-12 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-mono text-base font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                    N
                  </div>
                  <div className="w-12 h-12 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center font-mono text-base font-bold text-amber-600 dark:text-amber-400 shadow-sm">
                    M
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 text-[11px] mt-1">
                <span className="text-blue-500">Word</span>
                <span className="text-neutral-300 dark:text-neutral-700">/</span>
                <span className="text-amber-500">Non-word</span>
              </div>
            </div>
          </div>

          {/* Mini keyboard context */}
          <div className="flex flex-col items-center gap-1 mt-2">
            {/* Top row: Q-P */}
            <div className="flex gap-0.5">
              {["Q","W","E","R","T","Y","U","I","O","P"].map((k) => {
                const pmCue = taskType === "PM" ? PM_CUES.find(c => c.key === k.toLowerCase()) : null;
                return (
                  <div
                    key={k}
                    className={`w-6 h-6 rounded text-[9px] flex items-center justify-center font-mono border ${
                      pmCue
                        ? "font-bold"
                        : "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-300 dark:text-neutral-700 border-neutral-200/60 dark:border-neutral-700/40"
                    }`}
                    style={pmCue ? {
                      color: pmCue.color,
                      backgroundColor: `${pmCue.color}15`,
                      borderColor: `${pmCue.color}40`,
                    } : undefined}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
            {/* Home row: A-L */}
            <div className="flex gap-0.5 pl-2">
              {["A","S","D","F","G","H","J","K","L"].map((k) => (
                <div key={k} className="w-6 h-6 rounded text-[9px] flex items-center justify-center font-mono bg-neutral-100 dark:bg-neutral-800/60 text-neutral-300 dark:text-neutral-700 border border-neutral-200/60 dark:border-neutral-700/40">
                  {k}
                </div>
              ))}
            </div>
            {/* Bottom row: Z-M */}
            <div className="flex gap-0.5 pl-5">
              {["Z","X","C","V","B","N","M"].map((k) => {
                const isN = k === "N";
                const isM = k === "M";
                return (
                  <div
                    key={k}
                    className={`w-6 h-6 rounded text-[9px] flex items-center justify-center font-mono border ${
                      isN
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 font-bold"
                        : isM
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 font-bold"
                        : "bg-neutral-100 dark:bg-neutral-800/60 text-neutral-300 dark:text-neutral-700 border-neutral-200/60 dark:border-neutral-700/40"
                    }`}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center mt-2">
              Highlighted keys are active
            </div>
          </div>
        </div>

        {/* Timing info */}
        <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Timing
          </h3>
          <ul className="text-neutral-600 dark:text-neutral-500 text-sm space-y-3 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              Each {isExperiment ? "item" : "stimulus"} appears for a maximum of 2 seconds
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neutral-300 dark:text-neutral-600 mt-0.5">&#8226;</span>
              A fixation cross (+) will appear before each {isExperiment ? "item" : "stimulus"}
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
