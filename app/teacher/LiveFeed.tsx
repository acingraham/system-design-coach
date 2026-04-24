"use client";

import { useState, useEffect, useCallback } from "react";
import { problems } from "@/lib/problems";

const ALL_PROBLEMS = problems.map((p) => p.title);
const ALL_STEPS = [
  "Functional Requirements",
  "Scale Question",
  "Nonfunctional Requirements",
  "Core Entities",
  "API Design",
];

type StructuredFeedback = {
  score: number;
  summary: string;
  positives: string[];
  suggestions: string[];
};

type Submission = {
  id: number;
  student_name: string;
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

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-yellow-400",
  3: "bg-green-400",
  4: "bg-green-600",
};

const SCORE_BG: Record<number, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-green-100 text-green-800",
  4: "bg-green-100 text-green-800",
};

export default function LiveFeed() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filterProblem, setFilterProblem] = useState("");
  const [filterStep, setFilterStep] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterStudents, setFilterStudents] = useState<Set<string>>(new Set());
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "summary">("feed");
  const [expandedId, setExpandedId] = useState<number | null>(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = parseInt(window.location.hash.slice(1), 10);
      return isNaN(id) ? null : id;
    }
    return null;
  });
  const [lastUpdate, setLastUpdate] = useState<string>("");

  function toggleExpanded(id: number) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) {
      window.history.pushState(null, "", `#${next}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  }

  useEffect(() => {
    function onPopState() {
      const hash = window.location.hash.slice(1);
      const id = parseInt(hash, 10);
      setExpandedId(isNaN(id) ? null : id);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions");
      if (!res.ok) return;
      const data = await res.json();
      setSubmissions(data.submissions);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 5000);
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  const problemOptions = ALL_PROBLEMS;
  const stepOptions = ALL_STEPS;

  const TIME_OPTIONS: { label: string; minutes: number }[] = [
    { label: "Last 15 min", minutes: 15 },
    { label: "Last 30 min", minutes: 30 },
    { label: "Last hour", minutes: 60 },
    { label: "Today", minutes: 24 * 60 },
  ];

  // Derive unique student names from all submissions, sorted alphabetically
  const studentNames = Array.from(
    new Set(submissions.map((s) => s.student_name))
  ).sort((a, b) => a.localeCompare(b));

  function toggleStudent(name: string) {
    setFilterStudents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const filtered = submissions.filter((s) => {
    if (filterProblem && s.problem_title !== filterProblem) return false;
    if (filterStep && s.step_label !== filterStep) return false;
    if (filterStudents.size > 0 && !filterStudents.has(s.student_name))
      return false;
    if (filterTime) {
      const minutes = parseInt(filterTime, 10);
      const cutoff = new Date(Date.now() - minutes * 60 * 1000);
      const created = new Date(s.created_at + "Z");
      if (created < cutoff) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filterProblem}
          onChange={(e) => setFilterProblem(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All problems</option>
          {problemOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filterStep}
          onChange={(e) => setFilterStep(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All steps</option>
          {stepOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All time</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t.minutes} value={t.minutes}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Student multi-select dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setStudentDropdownOpen((o) => !o)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-left min-w-[140px] flex items-center justify-between gap-2"
          >
            <span className={filterStudents.size === 0 ? "text-gray-900" : "text-gray-900"}>
              {filterStudents.size === 0
                ? "All students"
                : filterStudents.size === 1
                  ? Array.from(filterStudents)[0]
                  : `${filterStudents.size} students`}
            </span>
            <span className="text-xs text-gray-400">▾</span>
          </button>
          {studentDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStudentDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-64 overflow-y-auto">
                {filterStudents.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStudents(new Set());
                      setStudentDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-indigo-600 hover:bg-gray-50 border-b border-gray-100"
                  >
                    Clear selection
                  </button>
                )}
                {studentNames.map((name) => (
                  <label
                    key={name}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filterStudents.has(name)}
                      onChange={() => toggleStudent(name)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-800">{name}</span>
                  </label>
                ))}
                {studentNames.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No students yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-gray-400">
          {filtered.length} submission{filtered.length !== 1 ? "s" : ""} · Last
          updated {lastUpdate}
        </span>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setViewMode("feed")}
            className={`px-3 py-1.5 text-xs font-medium ${
              viewMode === "feed"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Feed
          </button>
          <button
            type="button"
            onClick={() => setViewMode("summary")}
            className={`px-3 py-1.5 text-xs font-medium border-l border-gray-300 ${
              viewMode === "summary"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === "summary" && (() => {
        // Build per-student, per-problem, per-step summary from filtered submissions
        type StepSummary = { latestScore: number; attempts: number };
        type ProblemSummary = Record<string, StepSummary>;
        type StudentSummary = { problems: Record<string, ProblemSummary> };

        const summaryMap: Record<string, StudentSummary> = {};

        for (const s of filtered) {
          if (!summaryMap[s.student_name]) {
            summaryMap[s.student_name] = { problems: {} };
          }
          const student = summaryMap[s.student_name];
          if (!student.problems[s.problem_title]) {
            student.problems[s.problem_title] = {};
          }
          const prob = student.problems[s.problem_title];
          if (!prob[s.step_label]) {
            prob[s.step_label] = { latestScore: 0, attempts: 0 };
          }
          prob[s.step_label].attempts += 1;
          // Submissions are newest-first, so first encounter is the latest
          if (prob[s.step_label].latestScore === 0) {
            const fb = parseFeedback(s.feedback);
            if (fb) {
              prob[s.step_label].latestScore = Math.max(1, Math.min(4, Math.round(fb.score)));
            }
          }
        }

        const studentNamesSorted = Object.keys(summaryMap).sort((a, b) =>
          a.localeCompare(b)
        );

        // Determine which problems appear in the filtered data
        const problemsInView = Array.from(new Set(filtered.map((s) => s.problem_title)));

        if (studentNamesSorted.length === 0) {
          return (
            <div className="rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
              No submissions yet. Waiting for students...
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {studentNamesSorted.map((name) => {
              const student = summaryMap[name];
              return (
                <div
                  key={name}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-4"
                >
                  <div className="text-sm font-semibold text-gray-900 mb-3">
                    {name}
                  </div>
                  {problemsInView.map((prob) => {
                    const steps = student.problems[prob];
                    if (!steps) return null;
                    return (
                      <div key={prob} className="mb-3 last:mb-0">
                        <div className="text-xs text-gray-500 mb-1.5">{prob}</div>
                        <div className="flex flex-wrap gap-2">
                          {ALL_STEPS.map((stepLabel) => {
                            const info = steps[stepLabel];
                            // Abbreviate step labels
                            const abbrev: Record<string, string> = {
                              "Functional Requirements": "FR",
                              "Scale Question": "Scale",
                              "Nonfunctional Requirements": "NFR",
                              "Core Entities": "Entities",
                              "API Design": "API",
                            };
                            const label = abbrev[stepLabel] || stepLabel;
                            if (!info) {
                              return (
                                <div
                                  key={stepLabel}
                                  className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-400"
                                >
                                  <span>{label}</span>
                                  <span>—</span>
                                </div>
                              );
                            }
                            const score = info.latestScore;
                            return (
                              <div
                                key={stepLabel}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                              >
                                <span className="text-gray-700 font-medium">{label}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 font-semibold ${SCORE_BG[score]}`}
                                >
                                  {score}/4
                                </span>
                                {info.attempts > 1 && (
                                  <span className="text-gray-400">
                                    ({info.attempts})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Feed View */}
      {viewMode === "feed" && (filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
          No submissions yet. Waiting for students...
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            const structured = parseFeedback(s.feedback);
            const score = structured
              ? Math.max(1, Math.min(4, Math.round(structured.score)))
              : null;

            return (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(s.id)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {s.student_name}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {s.problem_title}
                      </span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {s.step_label}
                      </span>
                      {score && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${SCORE_BG[score]}`}
                        >
                          {score}/4
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-gray-600">
                      {s.answer.slice(0, 120)}
                      {s.answer.length > 120 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex-none text-xs text-gray-400">
                    {new Date(s.created_at + "Z").toLocaleTimeString()}
                  </div>
                  <span className="flex-none text-xs text-gray-400">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                    {/* Answer */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Answer
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                        {s.answer}
                      </p>
                    </div>

                    {/* Structured Feedback */}
                    {structured ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            AI Feedback
                          </div>
                          <div className="mt-1 text-sm font-medium text-gray-800">
                            {structured.summary}
                          </div>
                          {/* Score bar */}
                          <div className="mt-2 flex gap-1">
                            {[1, 2, 3, 4].map((seg) => (
                              <div
                                key={seg}
                                className={`h-1.5 flex-1 rounded-full ${
                                  seg <= score!
                                    ? SCORE_COLORS[seg]
                                    : "bg-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {structured.positives.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-500">
                              What went well
                            </div>
                            <ul className="mt-1 space-y-1">
                              {structured.positives.map((p, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-700"
                                >
                                  <span className="mt-0.5 flex-none text-green-600">
                                    ✓
                                  </span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {structured.suggestions.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-500">
                              Suggestions
                            </div>
                            <ul className="mt-1 space-y-1">
                              {structured.suggestions.map((sg, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-700"
                                >
                                  <span className="mt-0.5 flex-none text-orange-500">
                                    ●
                                  </span>
                                  <span>{sg}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          AI Feedback
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                          {s.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
