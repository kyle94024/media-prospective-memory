"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawSession {
  id: string;
  participant_id: string;
  task_type: string;
  phase: string;
  study_id: string | null;
  condition: string | null;
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
  handedness: string | null;
  free_response: string | null;
  created_at: string;
}

// ─── Statistics helpers ──────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function iqr(arr: number[]): [number, number] {
  if (arr.length < 2) return [0, 0];
  const sorted = [...arr].sort((a, b) => a - b);
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.floor(sorted.length * 0.75);
  return [sorted[q1Idx], sorted[q3Idx]];
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

function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = stddev(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = stddev(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
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
  const allVals = bars.flatMap((b) => b.ci ? [b.ci[0], b.ci[1], b.value] : [b.value]);
  const minV = Math.min(...allVals, 0);
  const maxV = maxVal ?? Math.max(...allVals, 1);
  const hasNegative = minV < 0;

  // For negative-capable charts, split height into positive and negative portions
  const range = (maxV - minV) * 1.15 || 1;
  const posRatio = hasNegative ? Math.max(maxV, 0) / range : 1;
  const posH = hasNegative ? height * posRatio : height;
  const negH = hasNegative ? height - posH : 0;

  const scale = (v: number) => hasNegative ? (v / range) * height : (v / (maxV * 1.15 || 1)) * height;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end gap-6 justify-center" style={{ height: posH || height }}>
        {bars.map((bar, i) => {
          const isPos = bar.value >= 0;
          const barH = isPos ? scale(bar.value) : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: 80 }}>
              <div className="text-xs text-neutral-500 font-mono tabular-nums">
                {bar.value.toFixed(unit === "%" ? 1 : 0)}{unit || ""}
              </div>
              <div className="relative flex items-end" style={{ height: posH || height }}>
                {/* CI whisker (positive part) */}
                {bar.ci && isPos && (() => {
                  const ciLow = scale(Math.max(bar.ci[0], 0));
                  const ciHigh = scale(Math.max(bar.ci[1], 0));
                  return (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-px bg-neutral-400 dark:bg-neutral-500"
                      style={{ bottom: ciLow, height: Math.max(ciHigh - ciLow, 0) }}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-px bg-neutral-400 dark:bg-neutral-500" />
                    </div>
                  );
                })()}
                <div
                  className="w-16 rounded-t-lg transition-all duration-500"
                  style={{ height: Math.max(barH, isPos ? 2 : 0), backgroundColor: isPos ? bar.color : "transparent" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Zero line and negative bars */}
      {hasNegative && (
        <>
          <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
          <div className="flex items-start gap-6 justify-center" style={{ height: negH }}>
            {bars.map((bar, i) => {
              const isNeg = bar.value < 0;
              const barH = isNeg ? scale(Math.abs(bar.value)) : 0;
              return (
                <div key={i} className="flex flex-col items-center" style={{ minWidth: 80 }}>
                  <div className="relative flex items-start" style={{ height: negH }}>
                    <div
                      className="w-16 rounded-b-lg transition-all duration-500"
                      style={{ height: Math.max(barH, isNeg ? 2 : 0), backgroundColor: isNeg ? bar.color : "transparent", opacity: isNeg ? 0.7 : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* Labels below */}
      <div className="flex gap-6 justify-center mt-1">
        {bars.map((bar, i) => (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: 80 }}>
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 text-center">
              {bar.label}
            </div>
            {bar.n !== undefined && (
              <div className="text-[10px] text-neutral-400">n={bar.n}</div>
            )}
          </div>
        ))}
      </div>
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

// ─── Histogram component (pure CSS bars + SVG normal overlay) ────────────────

function Histogram({
  data,
  color,
  label,
  unit = "",
  height = 140,
  binCount = 8,
}: {
  data: number[];
  color: string;
  label: string;
  unit?: string;
  height?: number;
  binCount?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs font-semibold text-neutral-500">{label}</div>
        <div className="flex items-center justify-center text-xs text-neutral-400 italic" style={{ height }}>
          Insufficient data (n={data.length})
        </div>
      </div>
    );
  }

  const m = mean(data);
  const s = stddev(data);
  const sk = skewness(data);
  const ku = kurtosis(data);
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const binWidth = range / binCount;

  // Build bins
  const bins: { lo: number; hi: number; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ lo: minVal + i * binWidth, hi: minVal + (i + 1) * binWidth, count: 0 });
  }
  for (const v of data) {
    let idx = Math.floor((v - minVal) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  // Normal curve points for SVG overlay
  const svgH = height;
  const steps = 60;
  // Build points as fractions [0..1] of width, then scale in viewBox
  const normalPoints: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = minVal + (range * i) / steps;
    const z = (x - m) / (s || 1);
    const pdf = Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * (s || 1));
    const pdfScaled = (pdf * data.length * binWidth) / maxCount;
    const px = (i / steps) * 100;
    const py = svgH - Math.min(pdfScaled, 1) * svgH;
    normalPoints.push(`${px},${Math.max(py, 0)}`);
  }

  // Format axis value compactly
  const fmtAxis = (v: number) => {
    if (unit === "%") return v.toFixed(0) + "%";
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    return v.toFixed(0);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 text-center leading-tight">{label}</div>
      <div className="relative w-full" style={{ height: svgH }}>
        {/* Bars */}
        <div className="flex items-end h-full gap-[2px] px-1">
          {bins.map((bin, i) => {
            const barH = (bin.count / maxCount) * height;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: Math.max(barH, bin.count > 0 ? 2 : 0),
                  backgroundColor: color,
                  opacity: 0.7,
                }}
                title={`${bin.lo.toFixed(1)}–${bin.hi.toFixed(1)}${unit}: ${bin.count}`}
              />
            );
          })}
        </div>
        {/* Normal curve overlay */}
        {s > 0 && (
          <svg
            className="absolute top-0 left-0 w-full pointer-events-none"
            style={{ height: svgH, padding: "0 4px" }}
            viewBox={`0 0 100 ${svgH}`}
            preserveAspectRatio="none"
          >
            <polyline
              points={normalPoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      {/* Axis labels */}
      <div className="flex justify-between w-full px-1 text-[9px] text-neutral-400 font-mono">
        <span>{fmtAxis(minVal)}</span>
        <span>{fmtAxis(maxVal)}</span>
      </div>
      {/* Stats */}
      <div className="text-[10px] text-neutral-500 font-mono text-center space-y-px">
        <div>n={data.length} &ensp; M={m.toFixed(unit === "%" ? 1 : 0)} &ensp; SD={s.toFixed(unit === "%" ? 1 : 0)}</div>
        <div className={`${Math.abs(sk) > 1 ? "text-amber-600 dark:text-amber-400" : ""}`}>
          skew={sk.toFixed(2)} &ensp; kurt={ku.toFixed(2)}
        </div>
      </div>
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
  const [useMedian, setUseMedian] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "before-mar1" | "after-mar1">("all");

  // Session exclusion (transient — resets on page load)
  const [excludedStudyIds, setExcludedStudyIds] = useState<Set<string>>(new Set());

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

  // ── Derived: map study_id → condition (from survey, for legacy sessions without condition column) ──

  const studyConditionMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of surveys) {
      if (s.study_id && s.condition) map[s.study_id] = s.condition;
    }
    return map;
  }, [surveys]);

  const getConditionForSession = useCallback(
    (s: RawSession): string | null => {
      // 1. Direct condition column (new sessions)
      if (s.condition) return s.condition;
      // 2. Fallback: look up via study_id → survey condition
      if (s.study_id && studyConditionMap[s.study_id]) return studyConditionMap[s.study_id];
      return null;
    },
    [studyConditionMap]
  );

  // ── Filtered sessions ──────────────────────────────────────────────────────

  const MAR1_CUTOFF = "2026-03-01";

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (completedOnly && !s.completed_at) return false;
      if (filterPhase !== "all" && s.phase !== filterPhase) return false;
      if (filterCondition !== "all") {
        const cond = getConditionForSession(s);
        if (cond !== filterCondition) return false;
      }
      if (filterDateRange !== "all") {
        const ts = s.completed_at || s.created_at;
        if (ts) {
          const isBefore = ts < MAR1_CUTOFF;
          if (filterDateRange === "before-mar1" && !isBefore) return false;
          if (filterDateRange === "after-mar1" && isBefore) return false;
        }
      }
      if (s.study_id && excludedStudyIds.has(s.study_id)) return false;
      return true;
    });
  }, [sessions, completedOnly, filterPhase, filterCondition, getConditionForSession, filterDateRange, excludedStudyIds]);

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
      if (s.study_id && excludedStudyIds.has(s.study_id)) return false;
      if (filterDateRange !== "all" && s.created_at) {
        const isBefore = s.created_at < MAR1_CUTOFF;
        if (filterDateRange === "before-mar1" && !isBefore) return false;
        if (filterDateRange === "after-mar1" && isBefore) return false;
      }
      return true;
    });
  }, [surveys, filterCondition, filterPlatform, excludedStudyIds, filterDateRange]);

  // ── Unique study IDs (participants) ────────────────────────────────────────

  const uniqueStudyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of filteredSessions) {
      if (s.study_id) ids.add(s.study_id);
    }
    return ids;
  }, [filteredSessions]);

  // ── Per-participant summaries for session management ─────────────────────

  interface PhaseMetrics {
    accuracy: number | null; // percentage
    meanRT: number | null;   // ms
    trialCount: number;
  }

  interface ParticipantSummary {
    studyId: string;
    condition: string | null;
    sessionCount: number;
    trialCount: number;
    ldBefore: PhaseMetrics;
    ldAfter: PhaseMetrics;
    pmBefore: PhaseMetrics;
    pmAfter: PhaseMetrics;
    survey: RawSurvey | null;
    completedAt: string | null;
  }

  const participantSummaries = useMemo(() => {
    const byStudy: Record<string, RawSession[]> = {};
    for (const s of sessions) {
      if (!s.study_id || !s.completed_at) continue;
      if (!byStudy[s.study_id]) byStudy[s.study_id] = [];
      byStudy[s.study_id].push(s);
    }

    const computeMetrics = (trialSet: RawTrial[]): PhaseMetrics => {
      if (trialSet.length === 0) return { accuracy: null, meanRT: null, trialCount: 0 };
      const correct = trialSet.filter((t) => t.correct);
      const rts = trialSet.filter((t) => t.correct && t.reaction_time !== null).map((t) => t.reaction_time!);
      return {
        accuracy: (correct.length / trialSet.length) * 100,
        meanRT: rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : null,
        trialCount: trialSet.length,
      };
    };

    const summaries: ParticipantSummary[] = [];
    for (const [studyId, pSessions] of Object.entries(byStudy)) {
      const pSessionIds = new Set(pSessions.map((s) => s.id));
      const pTrials = trials.filter((t) => pSessionIds.has(t.session_id));
      const cond = getConditionForSession(pSessions[0]);
      const survey = surveys.find((s) => s.study_id === studyId) || null;
      const latestCompleted = pSessions
        .map((s) => s.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] || null;

      // Split trials by phase
      const beforeSessionIds = new Set(pSessions.filter((s) => s.phase === "before").map((s) => s.id));
      const afterSessionIds = new Set(pSessions.filter((s) => s.phase === "after").map((s) => s.id));
      const beforeTrials = pTrials.filter((t) => beforeSessionIds.has(t.session_id));
      const afterTrials = pTrials.filter((t) => afterSessionIds.has(t.session_id));

      // Split by trial type and phase
      const ldBefore = beforeTrials.filter((t) => t.stimulus_type !== "pm_cue");
      const ldAfter = afterTrials.filter((t) => t.stimulus_type !== "pm_cue");
      const pmBefore = beforeTrials.filter((t) => t.stimulus_type === "pm_cue");
      const pmAfter = afterTrials.filter((t) => t.stimulus_type === "pm_cue");

      summaries.push({
        studyId,
        condition: cond,
        sessionCount: pSessions.length,
        trialCount: pTrials.length,
        ldBefore: computeMetrics(ldBefore),
        ldAfter: computeMetrics(ldAfter),
        pmBefore: computeMetrics(pmBefore),
        pmAfter: computeMetrics(pmAfter),
        survey,
        completedAt: latestCompleted,
      });
    }

    summaries.sort((a, b) => {
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return b.completedAt.localeCompare(a.completedAt);
    });

    return summaries;
  }, [sessions, trials, surveys, getConditionForSession]);

  // ── Per-condition trial data ───────────────────────────────────────────────

  // ── Helper: extract RTs from trials ────────────────────────────────────────

  const getRTs = (trials: RawTrial[]) =>
    trials.filter((t) => t.correct && t.reaction_time !== null).map((t) => t.reaction_time!);

  const getAccuracy = (trials: RawTrial[]) => {
    if (trials.length === 0) return 0;
    return (trials.filter((t) => t.correct).length / trials.length) * 100;
  };

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

    interface ConditionStats {
      // Overall
      rt: number[]; acc: number[];
      // By phase
      rtBefore: number[]; rtAfter: number[];
      accBefore: number[]; accAfter: number[];
      // Deltas (After − Before) per participant
      rtDelta: number[]; accDelta: number[];
      // LD-specific (words + nonwords)
      ldRtBefore: number[]; ldRtAfter: number[];
      ldAccBefore: number[]; ldAccAfter: number[];
      ldRtDelta: number[]; ldAccDelta: number[];
      // PM-specific (pm_cue trials)
      pmAccBefore: number[]; pmAccAfter: number[];
      pmRtBefore: number[]; pmRtAfter: number[];
      pmAccDelta: number[]; pmRtDelta: number[];
      // Combined
      pmAcc: number[]; ldAcc: number[];
    }

    const empty = (): ConditionStats => ({
      rt: [], acc: [],
      rtBefore: [], rtAfter: [],
      accBefore: [], accAfter: [],
      rtDelta: [], accDelta: [],
      ldRtBefore: [], ldRtAfter: [],
      ldAccBefore: [], ldAccAfter: [],
      ldRtDelta: [], ldAccDelta: [],
      pmAccBefore: [], pmAccAfter: [],
      pmRtBefore: [], pmRtAfter: [],
      pmAccDelta: [], pmRtDelta: [],
      pmAcc: [], ldAcc: [],
    });

    const result: Record<string, ConditionStats> = {
      limited: empty(),
      unlimited: empty(),
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

      // Split by phase
      const beforeTrials = pTrials.filter((t) => {
        const sess = pSessions.find((s) => s.id === t.session_id);
        return sess?.phase === "before";
      });
      const afterTrials = pTrials.filter((t) => {
        const sess = pSessions.find((s) => s.id === t.session_id);
        return sess?.phase === "after";
      });

      // Overall RT & accuracy by phase
      const rtsB = getRTs(beforeTrials);
      const rtsA = getRTs(afterTrials);
      if (rtsB.length > 0) result[condition].rtBefore.push(mean(rtsB));
      if (rtsA.length > 0) result[condition].rtAfter.push(mean(rtsA));
      if (beforeTrials.length > 0) result[condition].accBefore.push(getAccuracy(beforeTrials));
      if (afterTrials.length > 0) result[condition].accAfter.push(getAccuracy(afterTrials));

      // Deltas (overall)
      if (rtsB.length > 0 && rtsA.length > 0) result[condition].rtDelta.push(mean(rtsA) - mean(rtsB));
      if (beforeTrials.length > 0 && afterTrials.length > 0) result[condition].accDelta.push(getAccuracy(afterTrials) - getAccuracy(beforeTrials));

      // LD trials (word + nonword) by phase
      const ldBefore = beforeTrials.filter((t) => t.stimulus_type !== "pm_cue");
      const ldAfter = afterTrials.filter((t) => t.stimulus_type !== "pm_cue");
      const ldRtsB = getRTs(ldBefore);
      const ldRtsA = getRTs(ldAfter);
      if (ldRtsB.length > 0) result[condition].ldRtBefore.push(mean(ldRtsB));
      if (ldRtsA.length > 0) result[condition].ldRtAfter.push(mean(ldRtsA));
      if (ldBefore.length > 0) result[condition].ldAccBefore.push(getAccuracy(ldBefore));
      if (ldAfter.length > 0) result[condition].ldAccAfter.push(getAccuracy(ldAfter));
      if (ldRtsB.length > 0 && ldRtsA.length > 0) result[condition].ldRtDelta.push(mean(ldRtsA) - mean(ldRtsB));
      if (ldBefore.length > 0 && ldAfter.length > 0) result[condition].ldAccDelta.push(getAccuracy(ldAfter) - getAccuracy(ldBefore));

      // PM trials by phase
      const pmBefore = beforeTrials.filter((t) => t.stimulus_type === "pm_cue");
      const pmAfter = afterTrials.filter((t) => t.stimulus_type === "pm_cue");
      const pmRtsB = getRTs(pmBefore);
      const pmRtsA = getRTs(pmAfter);
      if (pmBefore.length > 0) result[condition].pmAccBefore.push(getAccuracy(pmBefore));
      if (pmAfter.length > 0) result[condition].pmAccAfter.push(getAccuracy(pmAfter));
      if (pmRtsB.length > 0) result[condition].pmRtBefore.push(mean(pmRtsB));
      if (pmRtsA.length > 0) result[condition].pmRtAfter.push(mean(pmRtsA));
      if (pmBefore.length > 0 && pmAfter.length > 0) result[condition].pmAccDelta.push(getAccuracy(pmAfter) - getAccuracy(pmBefore));
      if (pmRtsB.length > 0 && pmRtsA.length > 0) result[condition].pmRtDelta.push(mean(pmRtsA) - mean(pmRtsB));

      // Combined PM vs LD
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

  // (per-participant stats computed above in useMemo)

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

  // Central tendency wrappers — switch on useMedian toggle
  const ct = (arr: number[]) => useMedian ? median(arr) : mean(arr);
  const ctCI = (arr: number[]): [number, number] | undefined => {
    if (arr.length < 2) return undefined;
    return useMedian ? iqr(arr) : ci95(arr);
  };

  // Helper for descriptive stats table cells
  const fmtMSD = (arr: number[], unit: string = "") => {
    if (arr.length === 0) return "—";
    if (useMedian) {
      const m = median(arr);
      const [q1, q3] = iqr(arr);
      if (unit === "%") return `${m.toFixed(1)}% [${q1.toFixed(1)}–${q3.toFixed(1)}]`;
      return `${m.toFixed(0)}${unit} [${q1.toFixed(0)}–${q3.toFixed(0)}]`;
    }
    const m = mean(arr);
    const s = stddev(arr);
    if (unit === "%") return `${m.toFixed(1)}% (${s.toFixed(1)})`;
    return `${m.toFixed(0)}${unit} (${s.toFixed(0)})`;
  };

  const fmtN = (arr: number[]) => arr.length;

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
          <p className="text-sm text-neutral-500 max-w-2xl">
            Based on Barton &amp; Smyth (2025). Two conditions vary the pace of context-switching during a short-form video break. Performance on a combined Lexical Decision (LD) + Prospective Memory (PM) task is measured before and after the break.
          </p>
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

            {/* Central tendency toggle */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Central tendency</div>
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <button
                  onClick={() => setUseMedian(false)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    !useMedian
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950"
                      : "bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  Mean
                </button>
                <button
                  onClick={() => setUseMedian(true)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    useMedian
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950"
                      : "bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  Median
                </button>
              </div>
              <div className="text-[10px] text-neutral-400 mt-1.5">
                {useMedian ? "Showing Mdn [IQR]" : "Showing M (SD), 95% CI"}
              </div>
            </div>

            {/* Collection date range */}
            <div>
              <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Collection period</div>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as typeof filterDateRange)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="all">All dates</option>
                <option value="before-mar1">Before March 1</option>
                <option value="after-mar1">March 1 and after</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ── Session Management ──────────────────────────────────────────────── */}
        <Section
          title="Session Management"
          subtitle={`Review completed participants and exclude any from the analysis. ${excludedStudyIds.size > 0 ? `${excludedStudyIds.size} excluded.` : "All included."} Exclusions reset on page reload.`}
        >
          {excludedStudyIds.size > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExcludedStudyIds(new Set())}
                className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
              >
                Reset — Include all ({excludedStudyIds.size} excluded)
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left py-2 pr-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}></th>
                  <th className="text-left py-2 pr-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Study ID</th>
                  <th className="text-left py-2 pr-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Cond</th>
                  <th className="text-center px-1 py-1 text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800" colSpan={2}>LD Acc (%)</th>
                  <th className="text-center px-1 py-1 text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800" colSpan={2}>LD RT (ms)</th>
                  <th className="text-center px-1 py-1 text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800" colSpan={2}>PM Acc (%)</th>
                  <th className="text-center px-1 py-1 text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800" colSpan={2}>PM RT (ms)</th>
                  <th className="text-center py-2 pr-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Trials</th>
                  <th className="text-left py-2 pr-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Platform</th>
                  <th className="text-left py-2 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Survey</th>
                </tr>
                <tr className="border-b-2 border-neutral-300 dark:border-neutral-700">
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">B</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">A</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">B</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">A</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">B</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">A</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">B</th>
                  <th className="text-center px-1 py-1 text-[9px] text-neutral-400 uppercase">A</th>
                </tr>
              </thead>
              <tbody>
                {participantSummaries.map((p) => {
                  const isExcluded = excludedStudyIds.has(p.studyId);
                  const accCell = (m: PhaseMetrics) => {
                    if (m.accuracy === null) return "—";
                    const low = m.accuracy < 60;
                    return <span className={low ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>{m.accuracy.toFixed(1)}</span>;
                  };
                  const rtCell = (m: PhaseMetrics) => {
                    if (m.meanRT === null) return "—";
                    return m.meanRT.toFixed(0);
                  };
                  return (
                    <tr
                      key={p.studyId}
                      className={`border-b border-neutral-100 dark:border-neutral-900 transition-colors ${
                        isExcluded ? "opacity-40" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/20"
                      }`}
                    >
                      <td className="py-1.5 pr-2">
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => {
                            setExcludedStudyIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.studyId)) {
                                next.delete(p.studyId);
                              } else {
                                next.add(p.studyId);
                              }
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-2 border-neutral-300 dark:border-neutral-600 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-[10px] text-neutral-400 max-w-[160px] truncate" title={p.studyId}>
                        {p.studyId.length > 20 ? p.studyId.slice(0, 20) + "..." : p.studyId}
                      </td>
                      <td className="py-1.5 pr-2">
                        {p.condition ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            p.condition === "limited"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          }`}>
                            {p.condition === "limited" ? "A" : "1"}
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{accCell(p.ldBefore)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{accCell(p.ldAfter)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{rtCell(p.ldBefore)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{rtCell(p.ldAfter)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{accCell(p.pmBefore)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{accCell(p.pmAfter)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{rtCell(p.pmBefore)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-[11px]">{rtCell(p.pmAfter)}</td>
                      <td className="py-1.5 pr-2 text-center font-mono text-xs">{p.trialCount}</td>
                      <td className="py-1.5 pr-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                        {p.survey?.platform_used_during ? platformLabel(p.survey.platform_used_during) : "—"}
                      </td>
                      <td className="py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {[
                          p.survey?.platform_most_used ? `Most: ${platformLabel(p.survey.platform_most_used)}` : null,
                          p.survey?.daily_usage ? `Daily: ${p.survey.daily_usage}` : null,
                          p.survey?.handedness ? p.survey.handedness : null,
                        ].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
                {participantSummaries.length === 0 && (
                  <tr><td colSpan={14} className="py-6 text-center text-neutral-400 italic">No completed participants found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {participantSummaries.length > 0 && (
              <div className="text-xs text-neutral-400 dark:text-neutral-500 flex-1">
                {participantSummaries.length} completed participant{participantSummaries.length !== 1 ? "s" : ""} total.
                {excludedStudyIds.size > 0 && ` ${participantSummaries.length - excludedStudyIds.size} included in analysis.`}
                {" "}B = Before break, A = After break. Accuracy &lt;60% highlighted in red.
              </div>
            )}
            {participantSummaries.length > 0 && (
              <button
                onClick={() => {
                  const header = [
                    "study_id", "condition",
                    "ld_acc_before", "ld_acc_after", "ld_rt_before", "ld_rt_after",
                    "pm_acc_before", "pm_acc_after", "pm_rt_before", "pm_rt_after",
                    "total_trials",
                    "platform_used_during", "platform_most_used", "daily_usage", "handedness", "free_response",
                  ].join(",");
                  const rows = participantSummaries.map((p) => [
                    p.studyId,
                    p.condition || "",
                    p.ldBefore.accuracy !== null ? p.ldBefore.accuracy.toFixed(2) : "",
                    p.ldAfter.accuracy !== null ? p.ldAfter.accuracy.toFixed(2) : "",
                    p.ldBefore.meanRT !== null ? p.ldBefore.meanRT.toFixed(2) : "",
                    p.ldAfter.meanRT !== null ? p.ldAfter.meanRT.toFixed(2) : "",
                    p.pmBefore.accuracy !== null ? p.pmBefore.accuracy.toFixed(2) : "",
                    p.pmAfter.accuracy !== null ? p.pmAfter.accuracy.toFixed(2) : "",
                    p.pmBefore.meanRT !== null ? p.pmBefore.meanRT.toFixed(2) : "",
                    p.pmAfter.meanRT !== null ? p.pmAfter.meanRT.toFixed(2) : "",
                    p.trialCount,
                    p.survey?.platform_used_during || "",
                    p.survey?.platform_most_used || "",
                    `"${(p.survey?.daily_usage || "").replace(/"/g, '""')}"`,
                    p.survey?.handedness || "",
                    `"${(p.survey?.free_response || "").replace(/"/g, '""')}"`,
                  ].join(","));
                  const csv = [header, ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "participant_summaries.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors whitespace-nowrap"
              >
                Export Participant Summaries CSV
              </button>
            )}
          </div>
        </Section>

        {/* ── Overview Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={sessions.length.toString()} sub={`${sessions.filter((s) => s.completed_at).length} completed`} />
          <StatCard label="Filtered Sessions" value={filteredSessions.length.toString()} sub={`${uniqueStudyIds.size} participants`} />
          <StatCard label="Filtered Trials" value={filteredTrials.length.toString()} sub={`${filteredTrials.filter((t) => t.correct).length} correct`} />
          <StatCard label="Survey Responses" value={filteredSurveys.length.toString()} />
        </div>

        {/* ── Descriptive Statistics Table ──────────────────────────────────── */}
        <Section
          title="Descriptive Statistics"
          subtitle={useMedian
            ? "Per-participant medians [IQR] for each measure by condition and phase. Delta = After − Before."
            : "Per-participant means (SD) for each measure by condition and phase. Delta = After − Before."
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-300 dark:border-neutral-700">
                  <th className="text-left py-3 pr-4 text-xs text-neutral-400 uppercase tracking-wider" rowSpan={2}>Measure</th>
                  <th className="text-center px-3 py-2 text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b border-neutral-200 dark:border-neutral-700" colSpan={4}>Limited (A)</th>
                  <th className="text-center px-3 py-2 text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-700" colSpan={4}>Unlimited (1)</th>
                </tr>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">Before</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">After</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase font-bold">Delta</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">n</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">Before</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">After</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase font-bold">Delta</th>
                  <th className="text-center px-3 py-2 text-[10px] text-neutral-400 uppercase">n</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {[
                  { label: "LD Accuracy (%)", bL: perParticipantStats.limited.ldAccBefore, aL: perParticipantStats.limited.ldAccAfter, dL: perParticipantStats.limited.ldAccDelta, bU: perParticipantStats.unlimited.ldAccBefore, aU: perParticipantStats.unlimited.ldAccAfter, dU: perParticipantStats.unlimited.ldAccDelta, unit: "%" },
                  { label: "LD RT (ms)", bL: perParticipantStats.limited.ldRtBefore, aL: perParticipantStats.limited.ldRtAfter, dL: perParticipantStats.limited.ldRtDelta, bU: perParticipantStats.unlimited.ldRtBefore, aU: perParticipantStats.unlimited.ldRtAfter, dU: perParticipantStats.unlimited.ldRtDelta, unit: " ms" },
                  { label: "PM Accuracy (%)", bL: perParticipantStats.limited.pmAccBefore, aL: perParticipantStats.limited.pmAccAfter, dL: perParticipantStats.limited.pmAccDelta, bU: perParticipantStats.unlimited.pmAccBefore, aU: perParticipantStats.unlimited.pmAccAfter, dU: perParticipantStats.unlimited.pmAccDelta, unit: "%" },
                  { label: "PM RT (ms)", bL: perParticipantStats.limited.pmRtBefore, aL: perParticipantStats.limited.pmRtAfter, dL: perParticipantStats.limited.pmRtDelta, bU: perParticipantStats.unlimited.pmRtBefore, aU: perParticipantStats.unlimited.pmRtAfter, dU: perParticipantStats.unlimited.pmRtDelta, unit: " ms" },
                  { label: "Overall Accuracy (%)", bL: perParticipantStats.limited.accBefore, aL: perParticipantStats.limited.accAfter, dL: perParticipantStats.limited.accDelta, bU: perParticipantStats.unlimited.accBefore, aU: perParticipantStats.unlimited.accAfter, dU: perParticipantStats.unlimited.accDelta, unit: "%" },
                  { label: "Overall RT (ms)", bL: perParticipantStats.limited.rtBefore, aL: perParticipantStats.limited.rtAfter, dL: perParticipantStats.limited.rtDelta, bU: perParticipantStats.unlimited.rtBefore, aU: perParticipantStats.unlimited.rtAfter, dU: perParticipantStats.unlimited.rtDelta, unit: " ms" },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/20">
                    <td className="py-2.5 pr-4 text-xs font-sans font-medium text-neutral-700 dark:text-neutral-300">{row.label}</td>
                    <td className="text-center px-3 py-2.5">{fmtMSD(row.bL, row.unit)}</td>
                    <td className="text-center px-3 py-2.5">{fmtMSD(row.aL, row.unit)}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${row.dL.length > 0 && mean(row.dL) < 0 ? "text-rose-600 dark:text-rose-400" : row.dL.length > 0 && mean(row.dL) > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {fmtMSD(row.dL, row.unit)}
                    </td>
                    <td className="text-center px-3 py-2.5 text-neutral-400">{fmtN(row.dL)}</td>
                    <td className="text-center px-3 py-2.5">{fmtMSD(row.bU, row.unit)}</td>
                    <td className="text-center px-3 py-2.5">{fmtMSD(row.aU, row.unit)}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${row.dU.length > 0 && mean(row.dU) < 0 ? "text-rose-600 dark:text-rose-400" : row.dU.length > 0 && mean(row.dU) > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {fmtMSD(row.dU, row.unit)}
                    </td>
                    <td className="text-center px-3 py-2.5 text-neutral-400">{fmtN(row.dU)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Change Scores (Deltas): Bar Charts ─────────────────────────────── */}
        <Section
          title="Change Scores (After − Before)"
          subtitle="Per-participant delta scores by condition. Negative accuracy deltas = decline after break. Positive RT deltas = slower after break."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LD Accuracy Delta */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">LD Accuracy Change</h3>
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: ct(perParticipantStats.limited.ldAccDelta),
                    ci: perParticipantStats.limited.ldAccDelta.length >= 2 ? ctCI(perParticipantStats.limited.ldAccDelta) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.ldAccDelta.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: ct(perParticipantStats.unlimited.ldAccDelta),
                    ci: perParticipantStats.unlimited.ldAccDelta.length >= 2 ? ctCI(perParticipantStats.unlimited.ldAccDelta) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.ldAccDelta.length,
                  },
                ]}
                unit="%"
                height={180}
              />
              {(() => {
                const t = welchTTest(perParticipantStats.limited.ldAccDelta, perParticipantStats.unlimited.ldAccDelta);
                const d = cohensD(perParticipantStats.limited.ldAccDelta, perParticipantStats.unlimited.ldAccDelta);
                return (
                  <div className="mt-3 text-center space-y-0.5">
                    <div className="font-mono text-[10px] text-neutral-500">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-[10px] text-neutral-500">d = {d.toFixed(3)}</div>
                  </div>
                );
              })()}
            </div>

            {/* LD RT Delta */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">LD RT Change</h3>
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: ct(perParticipantStats.limited.ldRtDelta),
                    ci: perParticipantStats.limited.ldRtDelta.length >= 2 ? ctCI(perParticipantStats.limited.ldRtDelta) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.ldRtDelta.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: ct(perParticipantStats.unlimited.ldRtDelta),
                    ci: perParticipantStats.unlimited.ldRtDelta.length >= 2 ? ctCI(perParticipantStats.unlimited.ldRtDelta) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.ldRtDelta.length,
                  },
                ]}
                unit=" ms"
                height={180}
              />
              {(() => {
                const t = welchTTest(perParticipantStats.limited.ldRtDelta, perParticipantStats.unlimited.ldRtDelta);
                const d = cohensD(perParticipantStats.limited.ldRtDelta, perParticipantStats.unlimited.ldRtDelta);
                return (
                  <div className="mt-3 text-center space-y-0.5">
                    <div className="font-mono text-[10px] text-neutral-500">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-[10px] text-neutral-500">d = {d.toFixed(3)}</div>
                  </div>
                );
              })()}
            </div>

            {/* PM Accuracy Delta */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">PM Accuracy Change</h3>
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: ct(perParticipantStats.limited.pmAccDelta),
                    ci: perParticipantStats.limited.pmAccDelta.length >= 2 ? ctCI(perParticipantStats.limited.pmAccDelta) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.pmAccDelta.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: ct(perParticipantStats.unlimited.pmAccDelta),
                    ci: perParticipantStats.unlimited.pmAccDelta.length >= 2 ? ctCI(perParticipantStats.unlimited.pmAccDelta) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.pmAccDelta.length,
                  },
                ]}
                unit="%"
                height={180}
              />
              {(() => {
                const t = welchTTest(perParticipantStats.limited.pmAccDelta, perParticipantStats.unlimited.pmAccDelta);
                const d = cohensD(perParticipantStats.limited.pmAccDelta, perParticipantStats.unlimited.pmAccDelta);
                return (
                  <div className="mt-3 text-center space-y-0.5">
                    <div className="font-mono text-[10px] text-neutral-500">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-[10px] text-neutral-500">d = {d.toFixed(3)}</div>
                  </div>
                );
              })()}
            </div>

            {/* PM RT Delta */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">PM RT Change</h3>
              <BarChart
                bars={[
                  {
                    label: "Limited (A)",
                    value: ct(perParticipantStats.limited.pmRtDelta),
                    ci: perParticipantStats.limited.pmRtDelta.length >= 2 ? ctCI(perParticipantStats.limited.pmRtDelta) : undefined,
                    color: AMBER,
                    n: perParticipantStats.limited.pmRtDelta.length,
                  },
                  {
                    label: "Unlimited (1)",
                    value: ct(perParticipantStats.unlimited.pmRtDelta),
                    ci: perParticipantStats.unlimited.pmRtDelta.length >= 2 ? ctCI(perParticipantStats.unlimited.pmRtDelta) : undefined,
                    color: BLUE,
                    n: perParticipantStats.unlimited.pmRtDelta.length,
                  },
                ]}
                unit=" ms"
                height={180}
              />
              {(() => {
                const t = welchTTest(perParticipantStats.limited.pmRtDelta, perParticipantStats.unlimited.pmRtDelta);
                const d = cohensD(perParticipantStats.limited.pmRtDelta, perParticipantStats.unlimited.pmRtDelta);
                return (
                  <div className="mt-3 text-center space-y-0.5">
                    <div className="font-mono text-[10px] text-neutral-500">t({t.df.toFixed(1)}) = {t.t.toFixed(3)}, p = {t.p < 0.001 ? "< .001" : t.p.toFixed(3)}{t.p < 0.05 && <span className="text-emerald-500 ml-1">*</span>}</div>
                    <div className="font-mono text-[10px] text-neutral-500">d = {d.toFixed(3)}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Section>

        {/* ── Before vs After Break — LD Task ─────────────────────────────────── */}
        <Section
          title="Before vs After Break — LD Task"
          subtitle={`Lexical decision accuracy and RT by condition and phase. Per-participant ${useMedian ? "medians with IQR" : "means with 95% CI"}.`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">LD Accuracy</h3>
              <GroupedBarChart
                groups={[
                  {
                    label: "Limited (A)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.limited.ldAccBefore), ci: perParticipantStats.limited.ldAccBefore.length >= 2 ? ctCI(perParticipantStats.limited.ldAccBefore) : undefined, color: AMBER, n: perParticipantStats.limited.ldAccBefore.length },
                      { label: "After", value: ct(perParticipantStats.limited.ldAccAfter), ci: perParticipantStats.limited.ldAccAfter.length >= 2 ? ctCI(perParticipantStats.limited.ldAccAfter) : undefined, color: ROSE, n: perParticipantStats.limited.ldAccAfter.length },
                    ],
                  },
                  {
                    label: "Unlimited (1)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.unlimited.ldAccBefore), ci: perParticipantStats.unlimited.ldAccBefore.length >= 2 ? ctCI(perParticipantStats.unlimited.ldAccBefore) : undefined, color: BLUE, n: perParticipantStats.unlimited.ldAccBefore.length },
                      { label: "After", value: ct(perParticipantStats.unlimited.ldAccAfter), ci: perParticipantStats.unlimited.ldAccAfter.length >= 2 ? ctCI(perParticipantStats.unlimited.ldAccAfter) : undefined, color: PURPLE, n: perParticipantStats.unlimited.ldAccAfter.length },
                    ],
                  },
                ]}
                height={200}
                unit="%"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">LD Reaction Time</h3>
              <GroupedBarChart
                groups={[
                  {
                    label: "Limited (A)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.limited.ldRtBefore), ci: perParticipantStats.limited.ldRtBefore.length >= 2 ? ctCI(perParticipantStats.limited.ldRtBefore) : undefined, color: AMBER, n: perParticipantStats.limited.ldRtBefore.length },
                      { label: "After", value: ct(perParticipantStats.limited.ldRtAfter), ci: perParticipantStats.limited.ldRtAfter.length >= 2 ? ctCI(perParticipantStats.limited.ldRtAfter) : undefined, color: ROSE, n: perParticipantStats.limited.ldRtAfter.length },
                    ],
                  },
                  {
                    label: "Unlimited (1)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.unlimited.ldRtBefore), ci: perParticipantStats.unlimited.ldRtBefore.length >= 2 ? ctCI(perParticipantStats.unlimited.ldRtBefore) : undefined, color: BLUE, n: perParticipantStats.unlimited.ldRtBefore.length },
                      { label: "After", value: ct(perParticipantStats.unlimited.ldRtAfter), ci: perParticipantStats.unlimited.ldRtAfter.length >= 2 ? ctCI(perParticipantStats.unlimited.ldRtAfter) : undefined, color: PURPLE, n: perParticipantStats.unlimited.ldRtAfter.length },
                    ],
                  },
                ]}
                height={200}
                unit=" ms"
              />
            </div>
          </div>
        </Section>

        {/* ── Before vs After Break — PM Task ─────────────────────────────────── */}
        <Section
          title="Before vs After Break — PM Task"
          subtitle={`Prospective memory cue accuracy and RT by condition and phase. Per-participant ${useMedian ? "medians with IQR" : "means with 95% CI"}.`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">PM Accuracy</h3>
              <GroupedBarChart
                groups={[
                  {
                    label: "Limited (A)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.limited.pmAccBefore), ci: perParticipantStats.limited.pmAccBefore.length >= 2 ? ctCI(perParticipantStats.limited.pmAccBefore) : undefined, color: AMBER, n: perParticipantStats.limited.pmAccBefore.length },
                      { label: "After", value: ct(perParticipantStats.limited.pmAccAfter), ci: perParticipantStats.limited.pmAccAfter.length >= 2 ? ctCI(perParticipantStats.limited.pmAccAfter) : undefined, color: ROSE, n: perParticipantStats.limited.pmAccAfter.length },
                    ],
                  },
                  {
                    label: "Unlimited (1)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.unlimited.pmAccBefore), ci: perParticipantStats.unlimited.pmAccBefore.length >= 2 ? ctCI(perParticipantStats.unlimited.pmAccBefore) : undefined, color: BLUE, n: perParticipantStats.unlimited.pmAccBefore.length },
                      { label: "After", value: ct(perParticipantStats.unlimited.pmAccAfter), ci: perParticipantStats.unlimited.pmAccAfter.length >= 2 ? ctCI(perParticipantStats.unlimited.pmAccAfter) : undefined, color: PURPLE, n: perParticipantStats.unlimited.pmAccAfter.length },
                    ],
                  },
                ]}
                height={200}
                unit="%"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-4">PM Reaction Time</h3>
              <GroupedBarChart
                groups={[
                  {
                    label: "Limited (A)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.limited.pmRtBefore), ci: perParticipantStats.limited.pmRtBefore.length >= 2 ? ctCI(perParticipantStats.limited.pmRtBefore) : undefined, color: AMBER, n: perParticipantStats.limited.pmRtBefore.length },
                      { label: "After", value: ct(perParticipantStats.limited.pmRtAfter), ci: perParticipantStats.limited.pmRtAfter.length >= 2 ? ctCI(perParticipantStats.limited.pmRtAfter) : undefined, color: ROSE, n: perParticipantStats.limited.pmRtAfter.length },
                    ],
                  },
                  {
                    label: "Unlimited (1)",
                    bars: [
                      { label: "Before", value: ct(perParticipantStats.unlimited.pmRtBefore), ci: perParticipantStats.unlimited.pmRtBefore.length >= 2 ? ctCI(perParticipantStats.unlimited.pmRtBefore) : undefined, color: BLUE, n: perParticipantStats.unlimited.pmRtBefore.length },
                      { label: "After", value: ct(perParticipantStats.unlimited.pmRtAfter), ci: perParticipantStats.unlimited.pmRtAfter.length >= 2 ? ctCI(perParticipantStats.unlimited.pmRtAfter) : undefined, color: PURPLE, n: perParticipantStats.unlimited.pmRtAfter.length },
                    ],
                  },
                ]}
                height={200}
                unit=" ms"
              />
            </div>
          </div>
        </Section>

        {/* ── Distribution & Normality ──────────────────────────────────────── */}
        <Section
          title="Distribution & Normality Check"
          subtitle="Histograms with normal curve overlay. Skewness near 0 and kurtosis near 0 suggest normality (amber highlight if |skew| > 1). Assesses t-test assumptions on delta scores."
        >
          {/* Delta scores — the key variables for t-tests */}
          <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Change Scores (After − Before) — by Condition</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
            <Histogram data={perParticipantStats.limited.ldAccDelta} color={AMBER} label="LD Acc Δ — Limited" unit="%" />
            <Histogram data={perParticipantStats.unlimited.ldAccDelta} color={BLUE} label="LD Acc Δ — Unlimited" unit="%" />
            <Histogram data={perParticipantStats.limited.ldRtDelta} color={AMBER} label="LD RT Δ — Limited" unit=" ms" />
            <Histogram data={perParticipantStats.unlimited.ldRtDelta} color={BLUE} label="LD RT Δ — Unlimited" unit=" ms" />
            <Histogram data={perParticipantStats.limited.pmAccDelta} color={AMBER} label="PM Acc Δ — Limited" unit="%" />
            <Histogram data={perParticipantStats.unlimited.pmAccDelta} color={BLUE} label="PM Acc Δ — Unlimited" unit="%" />
            <Histogram data={perParticipantStats.limited.pmRtDelta} color={AMBER} label="PM RT Δ — Limited" unit=" ms" />
            <Histogram data={perParticipantStats.unlimited.pmRtDelta} color={BLUE} label="PM RT Δ — Unlimited" unit=" ms" />
          </div>

          {/* Delta scores — combined across conditions */}
          <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-800">Change Scores — Combined (All Participants)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
            <Histogram
              data={[...perParticipantStats.limited.ldAccDelta, ...perParticipantStats.unlimited.ldAccDelta]}
              color={GREEN} label="LD Accuracy Δ" unit="%"
            />
            <Histogram
              data={[...perParticipantStats.limited.ldRtDelta, ...perParticipantStats.unlimited.ldRtDelta]}
              color={GREEN} label="LD RT Δ" unit=" ms"
            />
            <Histogram
              data={[...perParticipantStats.limited.pmAccDelta, ...perParticipantStats.unlimited.pmAccDelta]}
              color={PURPLE} label="PM Accuracy Δ" unit="%"
            />
            <Histogram
              data={[...perParticipantStats.limited.pmRtDelta, ...perParticipantStats.unlimited.pmRtDelta]}
              color={PURPLE} label="PM RT Δ" unit=" ms"
            />
          </div>

          {/* Overall RT distributions */}
          <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-800">Overall Participant Mean RT &amp; Accuracy</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
            <Histogram data={perParticipantStats.limited.rt} color={AMBER} label="RT — Limited" unit=" ms" />
            <Histogram data={perParticipantStats.unlimited.rt} color={BLUE} label="RT — Unlimited" unit=" ms" />
            <Histogram
              data={[...perParticipantStats.limited.rt, ...perParticipantStats.unlimited.rt]}
              color={GREEN} label="RT — Combined" unit=" ms"
            />
            <Histogram
              data={[...perParticipantStats.limited.acc, ...perParticipantStats.unlimited.acc]}
              color={GREEN} label="Accuracy — Combined" unit="%"
            />
          </div>
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
                  value: ct(perfByPlatform[p]?.rt || []),
                  ci: (perfByPlatform[p]?.rt?.length || 0) >= 2 ? ctCI(perfByPlatform[p].rt) : undefined,
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
                  value: ct(perfByPlatform[p]?.acc || []),
                  ci: (perfByPlatform[p]?.acc?.length || 0) >= 2 ? ctCI(perfByPlatform[p].acc) : undefined,
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
                  value: ct(perfByMostUsedPlatform[p]?.rt || []),
                  ci: (perfByMostUsedPlatform[p]?.rt?.length || 0) >= 2 ? ctCI(perfByMostUsedPlatform[p].rt) : undefined,
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
                  value: ct(perfByMostUsedPlatform[p]?.acc || []),
                  ci: (perfByMostUsedPlatform[p]?.acc?.length || 0) >= 2 ? ctCI(perfByMostUsedPlatform[p].acc) : undefined,
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
                  <th className="text-left py-2 pr-4 text-xs text-neutral-400 uppercase tracking-wider">Daily Usage</th>
                  <th className="text-left py-2 text-xs text-neutral-400 uppercase tracking-wider">Handedness</th>
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
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{s.daily_usage || "—"}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400 capitalize">{s.handedness || "—"}</td>
                  </tr>
                ))}
                {filteredSurveys.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-neutral-400 italic">No survey data</td></tr>
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
                  ["id", "participant_id", "study_id", "condition", "platform_most_used", "platform_used_during", "daily_usage", "handedness", "free_response", "created_at"].join(","),
                  ...filteredSurveys.map((s) =>
                    [s.id, s.participant_id, s.study_id || "", s.condition || "", s.platform_most_used || "", s.platform_used_during || "", `"${(s.daily_usage || "").replace(/"/g, '""')}"`, s.handedness || "", `"${(s.free_response || "").replace(/"/g, '""')}"`, s.created_at].join(",")
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
