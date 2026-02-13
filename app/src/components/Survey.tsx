"use client";

import { useState } from "react";

interface SurveyProps {
  participantId: string;
  studyId?: string;
  condition?: string;
  onComplete: () => void;
}

const PLATFORMS = [
  {
    id: "youtube-shorts",
    label: "YouTube Shorts",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M21.582 6.186a2.506 2.506 0 0 0-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418A2.506 2.506 0 0 0 2.418 6.186C2 7.746 2 12 2 12s0 4.254.418 5.814a2.506 2.506 0 0 0 1.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 0 0 1.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM10 15.464V8.536L16 12l-6 3.464z"/>
      </svg>
    ),
    color: "#FF0000",
  },
  {
    id: "instagram",
    label: "Instagram Reels",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
    color: "#E1306C",
  },
  {
    id: "tiktok",
    label: "TikTok",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3z"/>
      </svg>
    ),
    color: "#000000",
  },
];

export default function Survey({ participantId, studyId, condition, onComplete }: SurveyProps) {
  const [platformMostUsed, setPlatformMostUsed] = useState<string | null>(null);
  const [platformUsedDuring, setPlatformUsedDuring] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          studyId: studyId || null,
          platformMostUsed: platformMostUsed || null,
          platformUsedDuring: platformUsedDuring || null,
          dailyUsage: dailyUsage.trim() || null,
          condition: condition || null,
        }),
      });
    } catch (e) {
      console.warn("Could not save survey:", e);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const renderPlatformGrid = (selected: string | null, onSelect: (id: string) => void) => (
    <div className="grid grid-cols-3 gap-4">
      {PLATFORMS.map((platform) => {
        const isSelected = selected === platform.id;
        return (
          <button
            key={platform.id}
            onClick={() => onSelect(platform.id)}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/50 scale-[1.02]"
                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
            }`}
          >
            <div
              className={`transition-colors ${
                isSelected
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
              style={isSelected ? { color: platform.color } : undefined}
            >
              {platform.logo}
            </div>
            <span
              className={`text-sm font-medium ${
                isSelected
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {platform.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="max-w-xl w-full space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="text-neutral-400 dark:text-neutral-500 text-sm uppercase tracking-widest">
              Quick Survey
            </div>
            <h1 className="text-3xl font-light text-neutral-900 dark:text-white">
              A few questions before you go
            </h1>
          </div>

          {/* Q1: Platform used during break */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-6">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Which platform did you use during the break?
            </label>
            {renderPlatformGrid(platformUsedDuring, setPlatformUsedDuring)}
          </div>

          {/* Q2: Platform most used */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-6">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Which short-form video platform do you use most?
            </label>
            {renderPlatformGrid(platformMostUsed, setPlatformMostUsed)}
          </div>

          {/* Q3: Daily usage */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-9 space-y-6">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              How much time do you typically spend on that platform daily?
            </label>
            <input
              type="text"
              value={dailyUsage}
              onChange={(e) => setDailyUsage(e.target.value)}
              placeholder="e.g., 2 hours, 30 minutes, etc."
              className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl px-6 py-4
                         text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600
                         focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700
                         transition-all duration-200 text-base"
            />
          </div>

          {/* Submit */}
          <div className="text-center pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 ${
                !saving
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
