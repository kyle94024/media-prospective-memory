export type TaskType = "LD" | "PM";
export type Phase = "before" | "after";
export type StimulusType = "word" | "nonword" | "pm_cue";

export interface PMCue {
  word: string;
  key: string;
  color: string;
}

export const PM_CUES: PMCue[] = [
  { word: "BLUE", key: "q", color: "#3B82F6" },
  { word: "PURPLE", key: "w", color: "#8B5CF6" },
  { word: "GREEN", key: "e", color: "#22C55E" },
];

export interface Trial {
  index: number;
  stimulus: string;
  type: StimulusType;
  pmCueKey?: string; // which PM key should be pressed (q/w/e)
}

export interface TrialResult {
  sessionId: string;
  trialIndex: number;
  stimulus: string;
  stimulusType: StimulusType;
  expectedKey: string;
  pressedKey: string | null;
  correct: boolean;
  reactionTime: number | null; // ms
  success: boolean; // responded within time window
  fixationDuration: number;
  timestamp: number;
}

export interface SessionConfig {
  taskType: TaskType;
  phase: Phase;
  participantId: string;
}

export interface SessionData {
  id: string;
  config: SessionConfig;
  trials: TrialResult[];
  startedAt: number;
  completedAt?: number;
}

// Timing constants (in ms) — shortened for feasibility
export const TIMING = {
  FIXATION_DURATIONS: [500, 750, 1000],
  STIMULUS_MAX_DURATION: 2000,
  ISI: 500, // inter-stimulus interval
  TRAINING_TRIALS: 10,
  LD_TRIALS_PER_BLOCK: 50,
  PM_TRIALS_PER_BLOCK: 10,
  MIN_LD_BEFORE_FIRST_PM: 5,
  MIN_LD_BETWEEN_PM: 5,
};
