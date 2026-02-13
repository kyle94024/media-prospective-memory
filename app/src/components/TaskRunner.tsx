"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Trial,
  TrialResult,
  TaskType,
  Phase,
  TIMING,
  PM_CUES,
} from "@/lib/types";
import {
  generateTrials,
  generateTrainingTrials,
  getRandomFixationDuration,
} from "@/lib/stimuli";

type TaskStage = "ready" | "fixation" | "stimulus" | "isi" | "feedback" | "done";

interface TaskRunnerProps {
  taskType: TaskType;
  phase: Phase;
  sessionId: string;
  isExperiment?: boolean;
  onComplete: (results: TrialResult[]) => void;
  isTraining?: boolean;
}

export default function TaskRunner({
  taskType,
  phase,
  sessionId,
  isExperiment = false,
  onComplete,
  isTraining = false,
}: TaskRunnerProps) {
  const [trials] = useState<Trial[]>(() =>
    isTraining ? generateTrainingTrials(taskType) : generateTrials(taskType, phase)
  );
  const [trialIndex, setTrialIndex] = useState(0);
  const [stage, setStage] = useState<TaskStage>("ready");
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  const trialsRef = useRef(trials);
  const trialIndexRef = useRef(0);
  const resultsRef = useRef<TrialResult[]>([]);
  const stimulusStartRef = useRef(0);
  const respondedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fixationDurationRef = useRef(1500);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const getExpectedKey = (trial: Trial): string => {
    if (trial.type === "pm_cue" && taskType === "PM") {
      return trial.pmCueKey || "q";
    }
    return trial.type === "word" ? "n" : "m";
  };

  const showTrial = useCallback((idx: number) => {
    const t = trialsRef.current;
    if (idx >= t.length) {
      setStage("done");
      setTimeout(() => onCompleteRef.current(resultsRef.current), 300);
      return;
    }

    trialIndexRef.current = idx;
    setTrialIndex(idx);
    respondedRef.current = false;
    setFeedback(null);

    const fd = getRandomFixationDuration();
    fixationDurationRef.current = fd;
    setStage("fixation");

    timerRef.current = setTimeout(() => {
      setStage("stimulus");
      stimulusStartRef.current = performance.now();

      timerRef.current = setTimeout(() => {
        if (respondedRef.current) return;
        respondedRef.current = true;

        const trial = t[idx];
        const result: TrialResult = {
          sessionId,
          trialIndex: idx,
          stimulus: trial.stimulus,
          stimulusType: trial.type,
          expectedKey: getExpectedKey(trial),
          pressedKey: null,
          correct: false,
          reactionTime: null,
          success: false,
          fixationDuration: fd,
          timestamp: Date.now(),
        };
        resultsRef.current = [...resultsRef.current, result];

        if (isTraining) {
          setFeedback({ correct: false, message: "Too slow! Try to respond faster." });
        } else {
          setFeedback({ correct: false, message: "Out of time" });
        }
        setStage("feedback");
        timerRef.current = setTimeout(() => {
          setStage("isi");
          timerRef.current = setTimeout(() => showTrial(idx + 1), TIMING.ISI);
        }, 800);
      }, TIMING.STIMULUS_MAX_DURATION);
    }, fd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, taskType, isTraining]);

  useEffect(() => {
    if (stage !== "stimulus") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = taskType === "PM" ? ["n", "m", "q", "w", "e"] : ["n", "m"];
      if (!validKeys.includes(key) || respondedRef.current) return;

      respondedRef.current = true;
      clearTimer();

      const idx = trialIndexRef.current;
      const trial = trialsRef.current[idx];
      const rt = performance.now() - stimulusStartRef.current;
      const expectedKey = getExpectedKey(trial);
      const correct = key === expectedKey;

      const result: TrialResult = {
        sessionId,
        trialIndex: idx,
        stimulus: trial.stimulus,
        stimulusType: trial.type,
        expectedKey,
        pressedKey: key,
        correct,
        reactionTime: Math.round(rt),
        success: true,
        fixationDuration: fixationDurationRef.current,
        timestamp: Date.now(),
      };
      resultsRef.current = [...resultsRef.current, result];

      if (isTraining) {
        let message = correct ? "Correct!" : "Incorrect.";
        if (!correct) {
          if (trial.type === "pm_cue" && taskType === "PM") {
            message += ` Press "${expectedKey.toUpperCase()}" for ${trial.stimulus}.`;
          } else {
            message += ` "${trial.stimulus}" is a ${trial.type === "word" ? "real word" : "non-word"}.`;
          }
        }
        setFeedback({ correct, message });
        setStage("feedback");
        timerRef.current = setTimeout(() => {
          setStage("isi");
          timerRef.current = setTimeout(() => showTrial(idx + 1), TIMING.ISI);
        }, 800);
      } else {
        setStage("isi");
        timerRef.current = setTimeout(() => showTrial(idx + 1), TIMING.ISI);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, sessionId, taskType, isTraining, showTrial]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const currentTrial = trials[trialIndex];
  const progress = trials.length > 0 ? ((trialIndex + 1) / trials.length) * 100 : 0;

  const taskLabel = isExperiment
    ? (phase === "before" ? "Task 1" : "Task 2")
    : (taskType === "PM" ? "Prospective Memory Task" : "Lexical Decision Task");
  const partLabel = isExperiment
    ? (phase === "before" ? "Part A" : "Part B")
    : (phase === "before" ? "Pre-Interruption" : "Post-Interruption");

  // Show rules reminder on Part A ready screen only (not training, not Part B)
  const showReadyReminder = !isTraining && taskType === "PM" && phase === "before";

  // Ready screen
  if (stage === "ready") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200 px-4">
        <div className="text-center space-y-8 max-w-lg">
          <div className="text-neutral-400 dark:text-neutral-400 text-sm uppercase tracking-widest">
            {isTraining ? "Training" : partLabel}
          </div>
          <h2 className="text-3xl font-light text-neutral-900 dark:text-white">
            {isTraining ? "Practice Round" : taskLabel}
          </h2>
          <p className="text-neutral-500 max-w-md text-base">
            {isTraining
              ? `${trials.length} practice trials with feedback`
              : `${trials.length} trials`}
          </p>

          {/* Compact rules reminder — Part A only */}
          {showReadyReminder && (
            <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-left space-y-5">
              <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-center">
                Quick Reminder
              </div>
              <div className={`flex items-start justify-center gap-8 md:gap-14`}>
                {/* Left hand */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    Left Hand
                  </div>
                  <div className="flex gap-1.5">
                    {PM_CUES.slice().reverse().map((cue) => (
                      <div
                        key={cue.key}
                        className="w-10 h-10 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-bold shadow-sm"
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
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-600">
                    Color-word cues
                  </div>
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center gap-1 pt-4 self-stretch">
                  <div className="flex-1 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-medium">+</span>
                  <div className="flex-1 w-px bg-neutral-200 dark:bg-neutral-700" />
                </div>

                {/* Right hand */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    Right Hand
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-10 h-10 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-mono text-sm font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                      N
                    </div>
                    <div className="w-10 h-10 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center font-mono text-sm font-bold text-amber-600 dark:text-amber-400 shadow-sm">
                      M
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-[10px]">
                    <span className="text-blue-500">Word</span>
                    <span className="text-neutral-300 dark:text-neutral-700">/</span>
                    <span className="text-amber-500">Non-word</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => showTrial(0)}
            className="px-10 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-full font-semibold
                       hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 mt-4 text-base"
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  // Done screen
  if (stage === "done") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
        <div className="text-center space-y-5">
          <div className="animate-spin w-8 h-8 border-2 border-neutral-200 dark:border-neutral-600 border-t-neutral-600 dark:border-t-white rounded-full mx-auto" />
          <div className="text-neutral-500 dark:text-neutral-400">Processing results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 select-none transition-colors duration-200">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-neutral-200 dark:bg-neutral-900">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Trial counter */}
      <div className="fixed top-5 right-7 text-neutral-400 dark:text-neutral-600 text-sm font-mono">
        {trialIndex + 1} / {trials.length}
      </div>

      {/* Main display area */}
      <div className="flex items-center justify-center w-full h-72">
        {stage === "fixation" && (
          <div className="text-7xl text-neutral-300 dark:text-neutral-600 font-extralight select-none">+</div>
        )}

        {stage === "stimulus" && currentTrial && (
          <div className="text-5xl md:text-7xl font-bold tracking-wider text-neutral-900 dark:text-white">
            {currentTrial.stimulus}
          </div>
        )}

        {stage === "isi" && <div className="w-1 h-1" />}

        {stage === "feedback" && feedback && (
          <div
            className={`text-2xl font-semibold ${
              feedback.correct ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Key reminders — only shown during practice */}
      {isTraining && (
        <div className="fixed bottom-10 left-0 right-0">
          <div className="flex justify-center gap-10 text-neutral-400 dark:text-neutral-600 text-sm">
            <div className="flex items-center gap-2.5">
              <kbd className="px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-md text-neutral-600 dark:text-neutral-400 font-mono text-xs border border-neutral-200 dark:border-neutral-700 shadow-sm">
                N
              </kbd>
              <span>Word</span>
            </div>
            <div className="flex items-center gap-2.5">
              <kbd className="px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-md text-neutral-600 dark:text-neutral-400 font-mono text-xs border border-neutral-200 dark:border-neutral-700 shadow-sm">
                M
              </kbd>
              <span>Non-word</span>
            </div>
            {taskType === "PM" && (
              <>
                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800" />
                {PM_CUES.map((cue) => (
                  <div key={cue.key} className="flex items-center gap-2.5">
                    <kbd
                      className="px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-md font-mono text-xs border shadow-sm"
                      style={{ color: cue.color, borderColor: `${cue.color}40` }}
                    >
                      {cue.key.toUpperCase()}
                    </kbd>
                    <span style={{ color: cue.color }}>{cue.word}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
