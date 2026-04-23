"use client";

import { useState, useEffect } from "react";
import FeedbackCard from "@/app/components/FeedbackCard";
import type { StructuredFeedback } from "@/lib/getFeedback";

type Submission = {
  id: number;
  problem_title: string;
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

export default function HistoryList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 animate-pulse">
        Loading history...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
        No submissions yet. Go practice a problem and come back!
      </div>
    );
  }

  // Group by problem
  const grouped = submissions.reduce(
    (acc, s) => {
      if (!acc[s.problem_title]) acc[s.problem_title] = [];
      acc[s.problem_title].push(s);
      return acc;
    },
    {} as Record<string, Submission[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([problem, subs]) => (
        <section key={problem}>
          <h2 className="text-lg font-semibold text-gray-900">{problem}</h2>
          <div className="mt-3 space-y-2">
            {subs.map((s) => {
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
                    onClick={() =>
                      setExpandedId(isExpanded ? null : s.id)
                    }
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {s.step_label}
                    </span>
                    {score && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          score >= 3
                            ? "bg-green-100 text-green-800"
                            : score >= 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {score}/4
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm text-gray-600">
                      {s.answer.slice(0, 100)}
                      {s.answer.length > 100 ? "..." : ""}
                    </span>
                    <span className="flex-none text-xs text-gray-400">
                      {new Date(s.created_at + "Z").toLocaleDateString()}
                    </span>
                    <span className="flex-none text-xs text-gray-400">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Your Answer
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                          {s.answer}
                        </p>
                      </div>

                      {structured ? (
                        <FeedbackCard feedback={structured} />
                      ) : (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Feedback
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
        </section>
      ))}
    </div>
  );
}
