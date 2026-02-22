"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawSession {
  id: string;
  participant_id: string;
  task_type: string;
  phase: string;
  study_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

interface RawTrial {
  id: number;
  session_id: string;
  trial_index: number;
  stimulus: string;
  stimulus_type: string;
  expected_key: string;
  pressed_key: string | null;
  correct: boolean;
  reaction_time: number | null;
  success: boolean;
  fixation_duration: number;
  timestamp: string;
}

interface RawSurvey {
  id: number;
  participant_id: string;
  study_id: string | null;
  platform_most_used: string | null;
  platform_used_during: string | null;
  daily_usage: string | null;
  condition: string | null;
  free_response: string | null;
  created_at: string;
}

// ─── Statistics helpers ──────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function sem(arr: number[]): number {
  if (arr.length < 2) return 0;
  return stddev(arr) / Math.sqrt(arr.length);
}

function ci95(arr: number[]): [number, number] {
  const m = mean(arr);
  const e = 1.96 * sem(arr);
  return [m - e, m + e];
}

function welchTTest(a: number[], b: number[]): { t: number; df: number; p: number } {
  if (a.length < 2 || b.length < 2) return { t: 0, df: 0, p: 1 };
  const mA = mean(a), mB = mean(b);
  const vA = stddev(a) ** 2, vB = stddev(b) ** 2;
  const nA = a.length, nB = b.length;
  const seD = Math.sqrt(vA / nA + vB / nB);
  if (seD === 0) return { t: 0, df: 0, p: 1 };
  const t = (mA - mB) / seD;
  const num = (vA / nA + vB / nB) ** 2;
  const den = (vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1);
  const df = den === 0 ? 0 : num / den;
  // Approximate two-tailed p using normal distribution for large df
  const p = df > 0 ? 2 * (1 - normalCDF(Math.abs(t))) : 1;
  return { t, df, p };
}

function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const pooledSD = Math.sqrt(
    ((a.length - 1) * stddev(a) ** 2 + (b.length - 1) * stddev(b) ** 2) / (a.length + b.length - 2)
  );
  if (pooledSD === 0) return 0;
  return (mean(a) - mean(b)) / pooledSD;
}

// Standard normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function pctStr(n: number, d: number): string {
  if (d === 0) return "—";
  return (100 * n / d).toFixed(1) + "%";
}

function fmtMs(ms: number): string {
  return ms.toFixed(0) + " ms";
}

// ─── Bar chart component (pure CSS) ─────────────────────────────────────────

function BarChart({
  bars,
  maxVal,
  unit,
  height = 200,
}: {
  bars: { label: string; value: number; ci?: [number, number]; color: string; n?: number }[];
  maxVal?: number;
  unit?: string;
  height?: number;
}) {
  const max = maxVal ?? Math.max(...bars.map((b) => b.ci ? b.ci[1] : b.value), 1) * 1.15;
  return (
    <div className="flex items-end gap-6 justify-center" style={{ height }}>
      {bars.map((bar, i) => {
        const barH = (bar.value / max) * height;
        const ciLow = bar.ci ? (bar.ci[0] / max) * height : barH;
        const ciHigh = bar.ci ? (bar.ci[1] / max) * height : barH;
        return (
          <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: 80 }}>
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              {bar.value.toFixed(unit === "%" ? 1 : 0)}{unit || ""}
            </div>
            <div className="relative flex items-end" style={{ height }}>
              {/* CI whisker */}
              {bar.ci && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-400 dark:bg-neutral-500"
                  style={{ bottom: ciLow, height: ciHigh - ciLow }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                </div>
              )}
              {/* Bar */}
              <div
                className="w-16 rounded-t-lg transition-all duration-500"
                style={{ height: Math.max(barH, 2), backgroundColor: bar.color }}
              />
            </div>
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 text-center mt-1">
              {bar.label}
            </div>
            {bar.n !== undefined && (
              <div className="text-[10px] text-neutral-400">n={bar.n}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Grouped bar chart ───────────────────────────────────────────────────────

function GroupedBarChart({
  groups,
  height = 200,
  unit,
}: {
  groups: {
    label: string;
    bars: { label: string; value: number; ci?: [number, number]; color: string; n?: number }[];
  }[];
  height?: number;
  unit?: string;
}) {
  const allBars = groups.flatMap((g) => g.bars);
  const max = Math.max(...allBars.map((b) => b.ci ? b.ci[1] : b.value), 1) * 1.15;
  return (
    <div className="flex items-end gap-8 justify-center">
      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col items-center">
          <div className="flex items-end gap-2" style={{ height }}>
            {group.bars.map((bar, bi) => {
              const barH = (bar.value / max) * height;
              const ciLow = bar.ci ? (bar.ci[0] / max) * height : barH;
              const ciHigh = bar.ci ? (bar.ci[1] / max) * height : barH;
              return (
                <div key={bi} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-neutral-500 font-mono tabular-nums">
                    {bar.value.toFixed(unit === "%" ? 1 : 0)}{unit || ""}
                  </div>
                  <div className="relative flex items-end" style={{ height }}>
                    {bar.ci && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-400 dark:bg-neutral-500"
                        style={{ bottom: Math.max(ciLow, 0), height: Math.max(ciHigh - ciLow, 0) }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                      </div>
                    )}
                    <div
                      className="w-12 rounded-t-lg transition-all duration-500"
                      style={{ height: Math.max(barH, 2), backgroundColor: bar.color }}
                    />
                  </div>
                  <div className="text-[10px] text-neutral-500">{bar.label}</div>
                </div>
              );
            })}
          </div>
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mt-2 border-t border-neutral-200 dark:border-neutral-700 pt-2 px-4">
            {group.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [sessions, setSessions] = useState<RawSession[]>([]);
  const [trials, setTrials] = useState<RawTrial[]>([]);
  const [surveys, setSurveys] = useState<RawSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [completedOnly, setCompletedOnly] = useState(true);
  const [filterCondition, setFilterCondition] = useState<"all" | "limited" | "unlimited">("all");
  const [filterPhase, setFilterPhase] = useState<"all" | "before" | "after">("all");
  const [filterStimulusType, setFilterStimulusType] = useState<"all" | "word" | "nonword" | "pm_cue">("all");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "youtube-shorts" | "instagram" | "tiktok">("all");
  const [correctOnly, setCorrectOnly] = useState(false);

  useEffect(() => {
    fetch("/api/analysis")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions || []);
        setTrials(data.trials || []);
        setSurveys(data.surveys || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived: map study_id → condition (from survey or session naming) ────

  const studyConditionMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of surveys) {
      if (s.study_id && s.condition) map[s.study_id] = s.condition;
    }
    return map;
  }, [surveys]);

  const getConditionForSession = useCallback(
    (s: RawSession): string | null => {
      if (s.study_id && studyConditionMap[s.study_id]) return studyConditionMap[s.study_id];
      // Infer from session id patterns
      if (s.id.includes("experimentA") || s.id.includes("/experimentA")) return "limited";
      if (s.id.includes("experiment1") || s.id.includes("/experiment1")) return "unlimited";
      return null;
    },
    [studyConditionMap]
  );

  // ── Filtered sessions ──────────────────────────────────────────────────────

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (completedOnly && !s.completed_at) return false;
      if (filterPhase !== "all" && s.phase !== filterPhase) return false;
      if (filterCondition !== "all") {
        const cond = getConditionForSession(s);
        if (cond !== filterCondition) return false;
      }
      return true;
    });
  }, [sessions, completedOnly, filterPhase, filterCondition, getConditionForSession]);

  const filteredSessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);

  // ── Filtered trials ────────────────────────────────────────────────────────

  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      if (!filteredSessionIds.has(t.session_id)) return false;
      if (filterStimulusType !== "all" && t.stimulus_type !== filterStimulusType) return false;
      if (correctOnly && !t.correct) return false;
      return true;
    });
  }, [trials, filteredSessionIds, filterStimulusType, correctOnly]);

  // ── Filtered surveys (by condition & platform) ─────────────────────────────

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (filterCondition !== "all" && s.condition !== filterCondition) return false;
      if (filterPlatform !== "all" && s.platform_used_during !== filterPlatform) return false;
      return true;
    });
  }, [surveys, filterCondition, filterPlatform]);

  // ── Unique study IDs (participants) ────────────────────────────────────────

  const uniqueStudyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of filteredSessions) {
      if (s.study_id) ids.add(s.study_id);
    }
    return ids;
  }, [filteredSessions]);

  // ── Per-condition trial data ───────────────────────────────────────────────

  const trialsByCondition = useMemo(() => {
    const sessionCondMap: Record<string, string> = {};
    for (const s of sessions) {
      const cond = getConditionForSession(s);
      if (cond) sessionCondMap[s.id] = cond;
    }

    const limited: RawTrial[] = [];
    const unlimited: RawTrial[] = [];
    for (const t of filteredTrials) {
      const cond = sessionCondMap[t.session_id];
      if (cond === "limited") limited.push(t);
      else if (cond === "unlimited") unlimited.push(t);
    }
    return { limited, unlimited };
  }, [sessions, filteredTrials, getConditionForSession]);

  // ── Per-phase trial data within each condition ─────────────────────────────

  const trialsByConditionPhase = useMemo(() => {
    const sessionInfoMap: Record<string, { condition: string | null; phase: string }> = {};
    for (const s of sessions) {
      sessionInfoMap[s.id] = { condition: getConditionForSession(s), phase: s.phase };
    }
    const result: Record<string, Record<string, RawTrial[]>> = {
      limited: { before: [], after: [] },
      unlimited: { before: [], after: [] },
    };
    for (const t of filteredTrials) {
      const info = sessionInfoMap[t.session_id];
      if (info?.condition && result[info.condition]) {
        result[info.condition][info.phase]?.push(t);
      }
    }
    return result;
  }, [sessions, filteredTrials, getConditionForSession]);

  // ── Helper: extract RTs from trials ────────────────────────────────────────

  const getRTs = (trials: RawTrial[]) =>
    trials.filter((t) => t.correct && t.reaction_time !== null).map((t) => t.reaction_time!);

  const getAccuracy = (trials: RawTrial[]) => {
    if (trials.length === 0) return 0;
    return (trials.filter((t) => t.correct).length / trials.length) * 100;
  };

  const getAccuracyArr = (trials: RawTrial[]) =>
    trials.map((t) => (t.correct ? 100 : 0));

  // ── Per-participant aggregation for proper between-subjects CI ──────────────

  const perParticipantStats = useMemo(() => {
    // Group sessions by study_id and condition
    const participantSessions: Record<string, { condition: string; sessions: RawSession[] }> = {};
    for (const s of filteredSessions) {
      if (!s.study_id) continue;
      const cond = getConditionForSession(s);
      if (!cond) continue;
      if (!participantSessions[s.study_id]) {
        participantSessions[s.study_id] = { condition: cond, sessions: [] };
      }
      participantSessions[s.study_id].sessions.push(s);
    }

    // For each participant, compute their mean RT and accuracy
    const result: Record<string, { rt: number[]; acc: number[]; rtBefore: number[]; rtAfter: number[]; accBefore: number[]; accAfter: number[]; pmAcc: number[]; ldAcc: number[] }> = {
      limited: { rt: [], acc: [], rtBefore: [], rtAfter: [], accBefore: [], accAfter: [], pmAcc: [], ldAcc: [] },
      unlimited: { rt: [], acc: [], rtBefore: [], rtAfter: [], accBefore: [], accAfter: [], pmAcc: [], ldAcc: [] },
    };

    for (const [studyId, { condition }] of Object.entries(participantSessions)) {
      const pSessions = participantSessions[studyId].sessions;
      const pSessionIds = new Set(pSessions.map((s) => s.id));
      const pTrials = filteredTrials.filter((t) => pSessionIds.has(t.session_id));

      if (pTrials.length === 0) continue;

      const rts = getRTs(pTrials);
      const acc = getAccuracy(pTrials);
      if (rts.length > 0) result[condition].rt.push(mean(rts));
      result[condition].acc.push(acc);

      // By phase
      const beforeTrials = pTrials.filter((t) => {
        const sess = pSessions.find((s) => s.id === t.session_id);
        return sess?.phase === "before";
      });
      const afterTrials = pTrials.filter((t) => {
        const sess = pSessions.find((s) => s.id === t.session_id);
        return sess?.phase === "after";
      });
      const rtsB = getRTs(beforeTrials);
      const rtsA = getRTs(afterTrials);
      if (rtsB.length > 0) result[condition].rtBefore.push(mean(rtsB));
      if (rtsA.length > 0) result[condition].rtAfter.push(mean(rtsA));
      if (beforeTrials.length > 0) result[condition].accBefore.push(getAccuracy(beforeTrials));
      if (afterTrials.length > 0) result[condition].accAfter.push(getAccuracy(afterTrials));

      // PM vs LD
      const pmTrials = pTrials.filter((t) => t.stimulus_type === "pm_cue");
      const ldTrials = pTrials.filter((t) => t.stimulus_type !== "pm_cue");
      if (pmTrials.length > 0) result[condition].pmAcc.push(getAccuracy(pmTrials));
      if (ldTrials.length > 0) result[condition].ldAcc.push(getAccuracy(ldTrials));
    }

    return result;
  }, [filteredSessions, filteredTrials, getConditionForSession]);

  // ── Survey breakdowns ──────────────────────────────────────────────────────

  const surveyBreakdown = useMemo(() => {
    const platformDuringCount: Record<string, number> = {};
    const platformMostCount: Record<string, number> = {};
    const conditionCount: Record<string, number> = {};

    for (const s of filteredSurveys) {
      if (s.platform_used_during) platformDuringCount[s.platform_used_during] = (platformDuringCount[s.platform_used_during] || 0) + 1;
      if (s.platform_most_used) platformMostCount[s.platform_most_used] = (platformMostCount[s.platform_most_used] || 0) + 1;
      if (s.condition) conditionCount[s.condition] = (conditionCount[s.condition] || 0) + 1;
    }

    return { platformDuringCount, platformMostCount, conditionCount };
  }, [filteredSurveys]);

  // ── Cross-tab: performance by platform used during break ───────────────────

  const perfByPlatform = useMemo(() => {
    // Map study_id → survey platform used during break
    const studyPlatform: Record<string, string> = {};
    for (const s of surveys) {
      if (s.study_id && s.platform_used_during) studyPlatform[s.study_id] = s.platform_used_during;
    }

    const platforms = ["youtube-shorts", "instagram", "tiktok"];
    const result: Record<string, { rt: number[]; acc: number[] }> = {};
    for (const p of platforms) result[p] = { rt: [], acc: [] };

    // Per-participant
    const byParticipant: Record<string, RawTrial[]> = {};
    for (const s of filteredSessions) {
      if (!s.study_id) continue;
      if (!byParticipant[s.study_id]) byParticipant[s.study_id] = [];
    }
    for (const t of filteredTrials) {
      const sess = filteredSessions.find((s) => s.id === t.session_id);
      if (sess?.study_id && byParticipant[sess.study_id]) {
        byParticipant[sess.study_id].push(t);
      }
    }

    for (const [studyId, pTrials] of Object.entries(byParticipant)) {
      const platform = studyPlatform[studyId];
      if (!platform || !result[platform]) continue;
      const rts = getRTs(pTrials);
      if (rts.length > 0) result[platform].rt.push(mean(rts));
      if (pTrials.length > 0) result[platform].acc.push(getAccuracy(pTrials));
    }

    return result;
  }, [surveys, filteredSessions, filteredTrials]);

  // ── Cross-tab: performance by most-used platform ───────────────────────────

  const perfByMostUsedPlatform = useMemo(() => {
    const studyPlatform: Record<string, string> = {};
    for (const s of surveys) {
      if (s.study_id && s.platform_most_used) studyPlatform[s.study_id] = s.platform_most_used;
    }

    const platforms = ["youtube-shorts", "instagram", "tiktok"];
    const result: Record<string, { rt: number[]; acc: number[] }> = {};
    for (const p of platforms) result[p] = { rt: [], acc: [] };

    const byParticipant: Record<string, RawTrial[]> = {};
    for (const s of filteredSessions) {
      if (!s.study_id) continue;
      if (!byParticipant[s.study_id]) byParticipant[s.study_id] = [];
    }
    for (const t of filteredTrials) {
      const sess = filteredSessions.find((s) => s.id === t.session_id);
      if (sess?.study_id && byParticipant[sess.study_id]) {
        byParticipant[sess.study_id].push(t);
      }
    }

    for (const [studyId, pTrials] of Object.entries(byParticipant)) {
      const platform = studyPlatform[studyId];
      if (!platform || !result[platform]) continue;
      const rts = getRTs(pTrials);
      if (rts.length > 0) result[platform].rt.push(mean(rts));
      if (pTrials.length > 0) result[platform].acc.push(getAccuracy(pTrials));
    }

    return result;
  }, [surveys, filteredSessions, filteredTrials]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-white rounded-full mx-auto" />
          <div className="text-neutral-500">Loading analysis data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">Error loading data</div>
          <div className="text-neutral-500">{error}</div>
        </div>
      </div>
    );
  }

  const limitedRTs = getRTs(trialsByCondition.limited);
  const unlimitedRTs = getRTs(trialsByCondition.unlimited);
  const limitedAcc = getAccuracyArr(trialsByCondition.limited);
  const unlimitedAcc = getAccuracyArr(trialsByCondition.unlimited);

  const rtTest = welchTTest(limitedRTs, unlimitedRTs);
  const rtD = cohensD(limitedRTs, unlimitedRTs);
  const accTest = welchTTest(limitedAcc, unlimitedAcc);
  const accD = cohensD(limitedAcc, unlimitedAcc);

  const BLUE = "#3B82F6";
  const AMBER = "#F59E0B";
  const GREEN = "#22C55E";
  const PURPLE = "#8B5CF6";
  const ROSE = "#F43F5E";
  const SKY = "#0EA5E9";

  const platformLabel = (id: string) =>
    id === "youtube-shorts" ? "YT Shorts" : id === "instagram" ? "Instagram" : id === "tiktok" ? "TikTok" : id;
  const platformColor = (id: string) =>
    id === "youtube-shorts" ? "#FF0000" : id === "instagram" ? "#E1306C" : "#000000";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-[0.2em]">
            Research Analysis
          </div>
          <h1 className="text-3xl font-light">Experiment Data Analysis</h1>
          <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
            <span>Exp A (/experimentA) = <strong className="text-amber-600 dark:text-amber-400">Limited</strong> (must watch full video)</span>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span>Exp 1 (/experiment1) = <strong className="text-blue-600 dark:text-blue-400">Unlimited</strong> (scroll freely)</span>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <Section title="Filters" subtitle="Control which data is included in the analysis below.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Completed only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={completedOnly}
                onChange={(e) => setCompletedOnly(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-neutral-300 dark:border-neutral-600 accent-blue-600"
              />
              <span className="text-sm">Completed sessions only</span>
            </label>

            {/* Correct trials only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={correctOnly}
                onChange={(e) => setCorrectOnly(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-neutral-300 dark:border-neutral-600 accent-blue-600"
              />
              <span className="text-sm">Correct trials only (for RT analysis)</span>
            </label>

            {/* Condition */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Condition</div>
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value as typeof filterCondition)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="all">All conditions</option>
                <option value="limited">A — Limited only</option>
                <option value="unlimited">1 — Unlimited only</option>
              </select>
            </div>

            {/* Phase */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Phase</div>
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value as typeof filterPhase)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="all">Both phases</option>
                <option value="before">Before break only</option>
                <option value="after">After break only</option>
              </select>
            </div>

            {/* Stimulus type */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Stimulus type</div>
              <select
                value={filterStimulusType}
                onChange={(e) => setFilterStimulusType(e.target.value as typeof filterStimulusType)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="all">All types</option>
                <option value="word">Words only</option>
                <option value="nonword">Nonwords only</option>
                <option value="pm_cue">PM cues only</option>
              </select>
            </div>

            {/* Platform filter */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Platform used during break</div>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value as typeof filterPlatform)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="all">All platforms</option>
                <option value="youtube-shorts">YouTube Shorts</option>
                <option value="instagram">Instagram Reels</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ── Overview Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={sessions.length.toString()} sub={`${sessions.filter((s) => s.completed_at).length} completed`} />
          <StatCard label="Filtered Sessions" value={filteredSessions.length.toString()} sub={`${uniqueStudyIds.size} participants`} />
          <StatCard label="Filtered Trials" value={filteredTrials.length.toString()} sub={`${filteredTrials.filter((t) => t.correct).length} correct`} />
          <StatCard label="Survey Responses" value={filteredSurveys.length.toString()} />
        </div>

        {/* ── Condition Comparison: Reaction Time ─────────────────────────────── */}
        <Section
          title="Reaction Time: Limited (A) vs Unlimited (1)"
          subtitle="Mean RT of correct trials with 95% confidence intervals. CI computed per-participant then across participants."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex justify-center">
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: mean(perParticipantStats.limited.rt),
                    ci: perParticipantStats.limited.rt.length >= 2 ? ci95(perParticipantStats.limited.rt) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.rt.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: mean(perParticipantStats.unlimited.rt),
                    ci: perParticipantStats.unlimited.rt.length >= 2 ? ci95(perParticipantStats.unlimited.rt) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.rt.length,
                  },
                ]}
                unit=" ms"
                height={220}
              />
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">Limited (A)</div>
                  <div className="font-mono">{fmtMs(mean(limitedRTs))} <span className="text-neutral-400">(SD {fmtMs(stddev(limitedRTs))})</span></div>
                  <div className="text-xs text-neutral-500">n = {limitedRTs.length} trials</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">Unlimited (1)</div>
                  <div className="font-mono">{fmtMs(mean(unlimitedRTs))} <span className="text-neutral-400">(SD {fmtMs(stddev(unlimitedRTs))})</span></div>
                  <div className="text-xs text-neutral-500">n = {unlimitedRTs.length} trials</div>
                </div>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-1">
                <div className="font-mono text-xs">
                  Welch&apos;s t({rtTest.df.toFixed(1)}) = {rtTest.t.toFixed(3)}, p = {rtTest.p < 0.001 ? "< .001" : rtTest.p.toFixed(3)}
                  {rtTest.p < 0.05 && <span className="text-emerald-500 ml-2">*</span>}
                </div>
                <div className="font-mono text-xs">Cohen&apos;s d = {rtD.toFixed(3)}</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Condition Comparison: Accuracy ───────────────────────────────────── */}
        <Section
          title="Accuracy: Limited (A) vs Unlimited (1)"
          subtitle="Overall accuracy with 95% confidence intervals."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex justify-center">
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: mean(perParticipantStats.limited.acc),
                    ci: perParticipantStats.limited.acc.length >= 2 ? ci95(perParticipantStats.limited.acc) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.acc.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: mean(perParticipantStats.unlimited.acc),
                    ci: perParticipantStats.unlimited.acc.length >= 2 ? ci95(perParticipantStats.unlimited.acc) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.acc.length,
                  },
                ]}
                unit="%"
                height={220}
                maxVal={105}
              />
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">Limited (A)</div>
                  <div className="font-mono">{pctStr(trialsByCondition.limited.filter((t) => t.correct).length, trialsByCondition.limited.length)}</div>
                  <div className="text-xs text-neutral-500">{trialsByCondition.limited.filter((t) => t.correct).length}/{trialsByCondition.limited.length} trials</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">Unlimited (1)</div>
                  <div className="font-mono">{pctStr(trialsByCondition.unlimited.filter((t) => t.correct).length, trialsByCondition.unlimited.length)}</div>
                  <div className="text-xs text-neutral-500">{trialsByCondition.unlimited.filter((t) => t.correct).length}/{trialsByCondition.unlimited.length} trials</div>
                </div>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-1">
                <div className="font-mono text-xs">
                  Welch&apos;s t({accTest.df.toFixed(1)}) = {accTest.t.toFixed(3)}, p = {accTest.p < 0.001 ? "< .001" : accTest.p.toFixed(3)}
                  {accTest.p < 0.05 && <span className="text-emerald-500 ml-2">*</span>}
                </div>
                <div className="font-mono text-xs">Cohen&apos;s d = {accD.toFixed(3)}</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Before vs After Break (by condition) ────────────────────────────── */}
        <Section
          title="Before vs After Break — Reaction Time"
          subtitle="Did the social media break differentially affect performance? Per-participant means with 95% CI."
        >
          <GroupedBarChart
            groups={[
              {
                label: "Limited (A)",
                bars: [
                  {
                    label: "Before",
                    value: mean(perParticipantStats.limited.rtBefore),
                    ci: perParticipantStats.limited.rtBefore.length >= 2 ? ci95(perParticipantStats.limited.rtBefore) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.rtBefore.length,
                  },
                  {
                    label: "After",
                    value: mean(perParticipantStats.limited.rtAfter),
                    ci: perParticipantStats.limited.rtAfter.length >= 2 ? ci95(perParticipantStats.limited.rtAfter) : undefined,
                    color: ROSE,
                    n: perParticipantStats.limited.rtAfter.length,
                  },
                ],
              },
              {
                label: "Unlimited (1)",
                bars: [
                  {
                    label: "Before",
                    value: mean(perParticipantStats.unlimited.rtBefore),
                    ci: perParticipantStats.unlimited.rtBefore.length >= 2 ? ci95(perParticipantStats.unlimited.rtBefore) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.rtBefore.length,
                  },
                  {
                    label: "After",
                    value: mean(perParticipantStats.unlimited.rtAfter),
                    ci: perParticipantStats.unlimited.rtAfter.length >= 2 ? ci95(perParticipantStats.unlimited.rtAfter) : undefined,
                    color: PURPLE,
                    n: perParticipantStats.unlimited.rtAfter.length,
                  },
                ],
              },
            ]}
            height={220}
            unit=" ms"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 space-y-1">
              <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Limited (A) — Before vs After</div>
              {(() => {
                const t = welchTTest(perParticipantStats.limited.rtBefore, perParticipantStats.limited.rtAfter);
                const d = cohensD(perParticipantStats.limited.rtBefore, perParticipantStats.limited.rtAfter);
                return (
                  <>
                    <div className="font-mono text-xs">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-xs">d = {d.toFixed(3)}</div>
                  </>
                );
              })()}
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 space-y-1">
              <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Unlimited (1) — Before vs After</div>
              {(() => {
                const t = welchTTest(perParticipantStats.unlimited.rtBefore, perParticipantStats.unlimited.rtAfter);
                const d = cohensD(perParticipantStats.unlimited.rtBefore, perParticipantStats.unlimited.rtAfter);
                return (
                  <>
                    <div className="font-mono text-xs">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-xs">d = {d.toFixed(3)}</div>
                  </>
                );
              })()}
            </div>
          </div>
        </Section>

        {/* ── Before vs After Break — Accuracy ────────────────────────────────── */}
        <Section
          title="Before vs After Break — Accuracy"
          subtitle="Accuracy change across the break. Per-participant means with 95% CI."
        >
          <GroupedBarChart
            groups={[
              {
                label: "Limited (A)",
                bars: [
                  {
                    label: "Before",
                    value: mean(perParticipantStats.limited.accBefore),
                    ci: perParticipantStats.limited.accBefore.length >= 2 ? ci95(perParticipantStats.limited.accBefore) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.accBefore.length,
                  },
                  {
                    label: "After",
                    value: mean(perParticipantStats.limited.accAfter),
                    ci: perParticipantStats.limited.accAfter.length >= 2 ? ci95(perParticipantStats.limited.accAfter) : undefined,
                    color: ROSE,
                    n: perParticipantStats.limited.accAfter.length,
                  },
                ],
              },
              {
                label: "Unlimited (1)",
                bars: [
                  {
                    label: "Before",
                    value: mean(perParticipantStats.unlimited.accBefore),
                    ci: perParticipantStats.unlimited.accBefore.length >= 2 ? ci95(perParticipantStats.unlimited.accBefore) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.accBefore.length,
                  },
                  {
                    label: "After",
                    value: mean(perParticipantStats.unlimited.accAfter),
                    ci: perParticipantStats.unlimited.accAfter.length >= 2 ? ci95(perParticipantStats.unlimited.accAfter) : undefined,
                    color: PURPLE,
                    n: perParticipantStats.unlimited.accAfter.length,
                  },
                ],
              },
            ]}
            height={220}
            unit="%"
          />
        </Section>

        {/* ── PM vs LD Accuracy by Condition ──────────────────────────────────── */}
        <Section
          title="PM vs LD Accuracy by Condition"
          subtitle="Prospective memory cue accuracy vs lexical decision accuracy."
        >
          <GroupedBarChart
            groups={[
              {
                label: "Limited (A)",
                bars: [
                  {
                    label: "PM Cues",
                    value: mean(perParticipantStats.limited.pmAcc),
                    ci: perParticipantStats.limited.pmAcc.length >= 2 ? ci95(perParticipantStats.limited.pmAcc) : undefined,
                    color: PURPLE,
                    n: perParticipantStats.limited.pmAcc.length,
                  },
                  {
                    label: "LD Trials",
                    value: mean(perParticipantStats.limited.ldAcc),
                    ci: perParticipantStats.limited.ldAcc.length >= 2 ? ci95(perParticipantStats.limited.ldAcc) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.ldAcc.length,
                  },
                ],
              },
              {
                label: "Unlimited (1)",
                bars: [
                  {
                    label: "PM Cues",
                    value: mean(perParticipantStats.unlimited.pmAcc),
                    ci: perParticipantStats.unlimited.pmAcc.length >= 2 ? ci95(perParticipantStats.unlimited.pmAcc) : undefined,
                    color: PURPLE,
                    n: perParticipantStats.unlimited.pmAcc.length,
                  },
                  {
                    label: "LD Trials",
                    value: mean(perParticipantStats.unlimited.ldAcc),
                    ci: perParticipantStats.unlimited.ldAcc.length >= 2 ? ci95(perParticipantStats.unlimited.ldAcc) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.ldAcc.length,
                  },
                ],
              },
            ]}
            height={220}
            unit="%"
          />
        </Section>

        {/* ── Survey Breakdown ────────────────────────────────────────────────── */}
        <Section title="Survey Responses" subtitle="Distribution of survey answers.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Platform used during break */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Platform used during break</h3>
              <div className="space-y-3">
                {Object.entries(surveyBreakdown.platformDuringCount).map(([platform, count]) => {
                  const total = Object.values(surveyBreakdown.platformDuringCount).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{platformLabel(platform)}</span>
                        <span className="font-mono text-neutral-500">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: platformColor(platform) }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(surveyBreakdown.platformDuringCount).length === 0 && (
                  <div className="text-sm text-neutral-400 italic">No data</div>
                )}
              </div>
            </div>

            {/* Most used platform */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Most-used platform overall</h3>
              <div className="space-y-3">
                {Object.entries(surveyBreakdown.platformMostCount).map(([platform, count]) => {
                  const total = Object.values(surveyBreakdown.platformMostCount).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={platform} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{platformLabel(platform)}</span>
                        <span className="font-mono text-neutral-500">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: platformColor(platform) }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(surveyBreakdown.platformMostCount).length === 0 && (
                  <div className="text-sm text-neutral-400 italic">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Condition distribution */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Participants by condition</h3>
            <div className="flex gap-6">
              {Object.entries(surveyBreakdown.conditionCount).map(([cond, count]) => (
                <div key={cond} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cond === "limited" ? AMBER : BLUE }} />
                  <span className="text-sm">{cond === "limited" ? "Limited (A)" : "Unlimited (1)"}: <strong>{count}</strong></span>
                </div>
              ))}
              {Object.keys(surveyBreakdown.conditionCount).length === 0 && (
                <div className="text-sm text-neutral-400 italic">No data</div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Cross-tab: Performance by Platform Used During Break ─────────────── */}
        <Section
          title="Performance by Platform Used During Break"
          subtitle="Does the specific platform used during the break affect post-break performance?"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Mean RT by platform</h3>
              <BarChart
                bars={["youtube-shorts", "instagram", "tiktok"].map((p) => ({
                  label: platformLabel(p),
                  value: mean(perfByPlatform[p]?.rt || []),
                  ci: (perfByPlatform[p]?.rt?.length || 0) >= 2 ? ci95(perfByPlatform[p].rt) : undefined,
                  color: platformColor(p),
                  n: perfByPlatform[p]?.rt?.length || 0,
                }))}
                unit=" ms"
                height={180}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Mean accuracy by platform</h3>
              <BarChart
                bars={["youtube-shorts", "instagram", "tiktok"].map((p) => ({
                  label: platformLabel(p),
                  value: mean(perfByPlatform[p]?.acc || []),
                  ci: (perfByPlatform[p]?.acc?.length || 0) >= 2 ? ci95(perfByPlatform[p].acc) : undefined,
                  color: platformColor(p),
                  n: perfByPlatform[p]?.acc?.length || 0,
                }))}
                unit="%"
                height={180}
                maxVal={105}
              />
            </div>
          </div>
        </Section>

        {/* ── Cross-tab: Performance by Most-Used Platform ─────────────────────── */}
        <Section
          title="Performance by Most-Used Platform"
          subtitle="Does habitual platform preference predict task performance?"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Mean RT by most-used platform</h3>
              <BarChart
                bars={["youtube-shorts", "instagram", "tiktok"].map((p) => ({
                  label: platformLabel(p),
                  value: mean(perfByMostUsedPlatform[p]?.rt || []),
                  ci: (perfByMostUsedPlatform[p]?.rt?.length || 0) >= 2 ? ci95(perfByMostUsedPlatform[p].rt) : undefined,
                  color: platformColor(p),
                  n: perfByMostUsedPlatform[p]?.rt?.length || 0,
                }))}
                unit=" ms"
                height={180}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">Mean accuracy by most-used platform</h3>
              <BarChart
                bars={["youtube-shorts", "instagram", "tiktok"].map((p) => ({
                  label: platformLabel(p),
                  value: mean(perfByMostUsedPlatform[p]?.acc || []),
                  ci: (perfByMostUsedPlatform[p]?.acc?.length || 0) >= 2 ? ci95(perfByMostUsedPlatform[p].acc) : undefined,
                  color: platformColor(p),
                  n: perfByMostUsedPlatform[p]?.acc?.length || 0,
                }))}
                unit="%"
                height={180}
                maxVal={105}
              />
            </div>
          </div>
        </Section>

        {/* ── Daily Usage Responses ───────────────────────────────────────────── */}
        <Section title="Daily Platform Usage (Self-Reported)" subtitle="Free-text responses about daily usage time.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left py-2 pr-4 text-xs text-neutral-400 uppercase tracking-wider">Participant</th>
                  <th className="text-left py-2 pr-4 text-xs text-neutral-400 uppercase tracking-wider">Condition</th>
                  <th className="text-left py-2 pr-4 text-xs text-neutral-400 uppercase tracking-wider">Most Used</th>
                  <th className="text-left py-2 pr-4 text-xs text-neutral-400 uppercase tracking-wider">Used During</th>
                  <th className="text-left py-2 text-xs text-neutral-400 uppercase tracking-wider">Daily Usage</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurveys.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 pr-4 font-mono text-xs text-neutral-500">{s.participant_id.slice(0, 20)}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        s.condition === "limited"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      }`}>
                        {s.condition === "limited" ? "A — Limited" : "1 — Unlimited"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{s.platform_most_used ? platformLabel(s.platform_most_used) : "—"}</td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{s.platform_used_during ? platformLabel(s.platform_used_during) : "—"}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{s.daily_usage || "—"}</td>
                  </tr>
                ))}
                {filteredSurveys.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-neutral-400 italic">No survey data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Free Responses ──────────────────────────────────────────────────── */}
        <Section title="Free Responses" subtitle="Open-ended participant feedback: &quot;Is there anything else you would like to mention?&quot;">
          <div className="space-y-4">
            {filteredSurveys.filter((s) => s.free_response).length === 0 ? (
              <div className="text-sm text-neutral-400 italic py-4">No free responses recorded yet.</div>
            ) : (
              filteredSurveys
                .filter((s) => s.free_response)
                .map((s) => (
                  <div key={s.id} className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-neutral-400">{s.participant_id.slice(0, 20)}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        s.condition === "limited"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      }`}>
                        {s.condition === "limited" ? "Limited (A)" : "Unlimited (1)"}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                      &ldquo;{s.free_response}&rdquo;
                    </p>
                  </div>
                ))
            )}
          </div>
        </Section>

        {/* ── Raw Session Data ────────────────────────────────────────────────── */}
        <Section title="Session Log" subtitle="All sessions matching current filters.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Session ID</th>
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Participant</th>
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Condition</th>
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Task</th>
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Phase</th>
                  <th className="text-left py-2 pr-3 text-xs text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 text-xs text-neutral-400 uppercase tracking-wider">Trials</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.slice(0, 100).map((s) => {
                  const cond = getConditionForSession(s);
                  const trialCount = trials.filter((t) => t.session_id === s.id).length;
                  return (
                    <tr key={s.id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-3 font-mono text-[10px] text-neutral-400 max-w-[200px] truncate">{s.id}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-neutral-500">{s.participant_id.slice(0, 15)}</td>
                      <td className="py-2 pr-3">
                        {cond ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            cond === "limited"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          }`}>
                            {cond === "limited" ? "A" : "1"}
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">?</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">{s.task_type}</td>
                      <td className="py-2 pr-3 text-xs">{s.phase}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${s.completed_at ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"}`} />
                      </td>
                      <td className="py-2 text-xs font-mono">{trialCount}</td>
                    </tr>
                  );
                })}
                {filteredSessions.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-neutral-400 italic">No sessions match filters</td></tr>
                )}
                {filteredSessions.length > 100 && (
                  <tr><td colSpan={7} className="py-3 text-center text-neutral-400 text-xs">Showing 100 of {filteredSessions.length} sessions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Export ──────────────────────────────────────────────────────────── */}
        <Section title="Export" subtitle="Download the raw data for further analysis.">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                const csv = [
                  ["session_id", "participant_id", "condition", "task_type", "phase", "trial_index", "stimulus", "stimulus_type", "expected_key", "pressed_key", "correct", "reaction_time", "success", "fixation_duration", "timestamp"].join(","),
                  ...filteredTrials.map((t) => {
                    const sess = sessions.find((s) => s.id === t.session_id);
                    const cond = sess ? getConditionForSession(sess) : "";
                    return [t.session_id, sess?.participant_id || "", cond || "", sess?.task_type || "", sess?.phase || "", t.trial_index, `"${t.stimulus}"`, t.stimulus_type, t.expected_key, t.pressed_key || "", t.correct, t.reaction_time ?? "", t.success, t.fixation_duration, t.timestamp].join(",");
                  }),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "trials_export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Export Trials CSV
            </button>
            <button
              onClick={() => {
                const csv = [
                  ["id", "participant_id", "study_id", "condition", "platform_most_used", "platform_used_during", "daily_usage", "free_response", "created_at"].join(","),
                  ...filteredSurveys.map((s) =>
                    [s.id, s.participant_id, s.study_id || "", s.condition || "", s.platform_most_used || "", s.platform_used_during || "", `"${(s.daily_usage || "").replace(/"/g, '""')}"`, `"${(s.free_response || "").replace(/"/g, '""')}"`, s.created_at].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "surveys_export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Export Surveys CSV
            </button>
          </div>
        </Section>

        <div className="text-center text-neutral-300 dark:text-neutral-800 text-xs py-8">
          Prospective Memory Study — Analysis Dashboard
        </div>
      </div>
    </div>
  );
}
