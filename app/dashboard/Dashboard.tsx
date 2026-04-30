"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { problems } from "@/lib/problems";
import { PHASES, STEPS } from "@/lib/steps";
import FeedbackCard from "@/app/components/FeedbackCard";
import type { StructuredFeedback } from "@/lib/getFeedback";

type Submission = {
  id: number;
  problem_id: string;
  problem_title: string;
  step: string;
  step_label: string;
  answer: string;
  feedback: string;
  created_at: string;
};

function parseFeedback(raw: string): StructuredFeedback | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && "score" in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

const STEP_ORDER = ["1A", "1B", "1C", "2", "3"] as const;

const SCORE_BG: Record<number, string> = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-orange-100 text-orange-700 border-orange-200",
  3: "bg-green-100 text-green-700 border-green-200",
  4: "bg-green-200 text-green-800 border-green-300",
};

export default function Dashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 animate-pulse">Loading...</div>
    );
  }

  // Build a map: problemId -> step -> latest submission
  const latestByProblemStep: Record<
    string,
    Record<string, Submission>
  > = {};
  // Submissions are already ordered by created_at DESC, so first occurrence is latest
  for (const s of submissions) {
    if (!latestByProblemStep[s.problem_id]) {
      latestByProblemStep[s.problem_id] = {};
    }
    if (!latestByProblemStep[s.problem_id][s.step]) {
      latestByProblemStep[s.problem_id][s.step] = s;
    }
  }

  return (
    <div className="space-y-6">
      {problems.map((problem) => {
        const stepMap = latestByProblemStep[problem.id] || {};
        const completedSteps = STEP_ORDER.filter((s) => stepMap[s]);
        const totalSteps = STEP_ORDER.length;
        const hasStarted = completedSteps.length > 0;

        return (
          <div
            key={problem.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            {/* Problem header */}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {problem.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {problem.description}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Link
                    href={`/problems/${problem.id}`}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    {hasStarted ? "Continue" : "Start"}
                  </Link>
                  {hasStarted && (
                    <Link
                      href={`/problems/${problem.id}?new=1`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      New Session
                    </Link>
                  )}
                </div>
              </div>

              {/* Progress + step details grouped by phase */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {completedSteps.length}/{totalSteps} steps completed
                  </span>
                  {hasStarted && (
                    <span>
                      {Math.round(
                        (completedSteps.length / totalSteps) * 100
                      )}
                      %
                    </span>
                  )}
                </div>
              </div>

              {hasStarted && (
                <div className="mt-2 flex gap-4">
                  {PHASES.map((phase) => (
                    <div key={phase.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5" style={{ flex: phase.steps.length }}>
                      <div className="mb-2 flex gap-1">
                        {phase.steps.map((step) => {
                          const sub = stepMap[step];
                          const feedback = sub ? parseFeedback(sub.feedback) : null;
                          const score = feedback
                            ? Math.max(1, Math.min(4, Math.round(feedback.score)))
                            : null;
                          return (
                            <div
                              key={step}
                              className={`h-2 flex-1 rounded-full ${
                                score
                                  ? score >= 3
                                    ? "bg-green-400"
                                    : score >= 2
                                      ? "bg-orange-400"
                                      : "bg-red-400"
                                  : "bg-gray-200"
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {phase.label}
                      </div>
                      <div className={`grid gap-2 ${phase.steps.length === 3 ? "grid-cols-3" : ""}`}>
                        {phase.steps.map((step) => {
                          const sub = stepMap[step];
                          const feedback = sub
                            ? parseFeedback(sub.feedback)
                            : null;
                          const score = feedback
                            ? Math.max(
                                1,
                                Math.min(4, Math.round(feedback.score))
                              )
                            : null;
                          const key = `${problem.id}-${step}`;
                          const isExpanded = expandedKey === key;

                          return (
                            <button
                              key={step}
                              type="button"
                              onClick={() =>
                                sub &&
                                setExpandedKey(isExpanded ? null : key)
                              }
                              disabled={!sub}
                              className={`rounded-lg border p-2 text-center text-xs transition ${
                                sub
                                  ? `${SCORE_BG[score!]} hover:opacity-80`
                                  : "border-gray-200 bg-gray-50 text-gray-400"
                              }`}
                            >
                              <div className="font-medium">
                                {STEPS[step].sidebarLabel}
                              </div>
                              {score && (
                                <div className="mt-0.5 font-semibold">
                                  {score}/4
                                </div>
                              )}
                              {!sub && <div className="mt-0.5">—</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded submission detail */}
            {STEP_ORDER.map((step) => {
              const key = `${problem.id}-${step}`;
              if (expandedKey !== key) return null;
              const sub = stepMap[step];
              if (!sub) return null;
              const feedback = parseFeedback(sub.feedback);

              return (
                <div
                  key={key}
                  className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-700">
                      {sub.step_label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(sub.created_at + "Z").toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Your Answer
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                      {sub.answer}
                    </p>
                  </div>

                  {feedback && <FeedbackCard feedback={feedback} />}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
