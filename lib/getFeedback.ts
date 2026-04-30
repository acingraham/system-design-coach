import type { Problem } from "./problems";
import type { Step } from "./steps";
import { FEEDBACK_PLACEHOLDERS } from "./steps";

export type StructuredFeedback = {
  score: number;
  summary: string;
  positives: string[];
  suggestions: string[];
};

export async function getFeedback(
  step: Exclude<Step, "done">,
  answer: string,
  problem: Problem,
  constraints: string[] | null,
  studentName: string,
  attemptId: string,
  signal?: AbortSignal,
  functionalRequirements?: string | null
): Promise<StructuredFeedback> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        answer,
        problemId: problem.id,
        problemTitle: problem.title,
        problemDescription: problem.description,
        constraints,
        studentName,
        attemptId,
        functionalRequirements,
      }),
      signal,
    });

    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    if (data.feedback && typeof data.feedback === "object") {
      return data.feedback as StructuredFeedback;
    }
    throw new Error("Invalid response");
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err; // Re-throw abort so caller can handle it
    }
    // Fall back to placeholder wrapped in structured format
    return {
      score: 2,
      summary: "Feedback unavailable — showing placeholder.",
      positives: ["Answer received."],
      suggestions: [FEEDBACK_PLACEHOLDERS[step]],
    };
  }
}
