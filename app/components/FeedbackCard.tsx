"use client";

import type { StructuredFeedback } from "@/lib/getFeedback";

const SCORE_CONFIG: Record<
  number,
  { label: string; textColor: string }
> = {
  1: { label: "Needs work. Keep at it!", textColor: "text-red-800" },
  2: { label: "Getting there. Some gaps to fill.", textColor: "text-yellow-800" },
  3: { label: "Good answer!", textColor: "text-green-700" },
  4: { label: "Great answer. Love it!", textColor: "text-green-800" },
};

const BAR_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-yellow-400",
  3: "bg-green-400",
  4: "bg-green-600",
};

export default function FeedbackCard({
  feedback,
}: {
  feedback: StructuredFeedback;
}) {
  const score = Math.max(1, Math.min(4, Math.round(feedback.score)));
  const config = SCORE_CONFIG[score];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
      {/* Score summary */}
      <div>
        <div className={`text-sm font-semibold ${config.textColor}`}>
          {feedback.summary || config.label}
        </div>
        {/* Score bar */}
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= score ? BAR_COLORS[s] : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* What went well */}
      {feedback.positives.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-900">
            What went well
          </div>
          <ul className="mt-2 space-y-2">
            {feedback.positives.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="mt-0.5 flex-none text-green-600">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {feedback.suggestions.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {score >= 3 ? "Minor suggestions" : "Suggestions"}
          </div>
          <ul className="mt-2 space-y-2">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="mt-0.5 flex-none text-orange-500">●</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
