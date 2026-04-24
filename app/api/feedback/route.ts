import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { saveSubmission, getPreviousSubmission } from "@/lib/db";
import { getProblem } from "@/lib/problems";
import { anonymousName } from "@/lib/anonymousName";

const client = new Anthropic();

const STEP_INSTRUCTIONS: Record<string, string> = {
  "1A": `The student is listing functional requirements — what the system should do from a user's perspective.
Evaluate: Are the requirements specific and actionable? Did they identify the core features? Did they keep it focused (2-3 core requirements, not a long list)? Did they appropriately scope out non-core features?
Hint for evaluation: most systems have both a "create" and a "use/consume" flow (e.g. creating a short URL AND redirecting via it, posting a message AND viewing a feed). Check whether the student covered both sides.`,
  "1B": `The student is asking a clarifying question about the scale of the system.
Evaluate: Is the question specific and measurable? Does it target a dimension that would change the design (DAU, read/write ratio, total stored items, latency targets)? Would the answer meaningfully impact architecture decisions?
IMPORTANT: Asking additional thoughtful questions beyond the primary scale question (e.g. read/write ratio, geographic distribution, growth projections) should NEVER lower the score — these demonstrate deeper architectural thinking. A single well-targeted DAU question is a 3; bonus questions that would meaningfully shape architecture push it to 4.`,
  "1C": `The student is identifying nonfunctional requirements — constraints like latency, availability, consistency, durability, etc.
Evaluate: Did they quantify their constraints with specific targets (not just "low latency")? Did they make explicit trade-offs (e.g. availability vs consistency)? Did they identify scale-related constraints?`,
  "2": `The student is identifying core entities (data models) in the system.
Evaluate: Did they identify the key entities? At this stage, simply listing the right entity names is a strong answer and deserves a score of 4. Listing relevant attributes is a bonus but not required — and only attributes that directly support the functional requirements matter. Do NOT penalize for missing attributes, relationships, foreign keys, or data modeling structure — that level of detail belongs in the high-level design phase, not here. Do NOT suggest adding attributes that aren't needed for the core functional requirements (e.g. "email" on a User entity when user auth is out of scope).`,
  "3": `The student is sketching the API design — endpoints, inputs, and outputs.
Evaluate: Did they use correct HTTP verbs? Are naming conventions RESTful (plural nouns)? Did they include request/response formats? Did they consider important details like status codes, auth, and optional parameters?`,
};

const STEP_LABELS: Record<string, string> = {
  "1A": "Functional Requirements",
  "1B": "Scale Question",
  "1C": "Nonfunctional Requirements",
  "2": "Core Entities",
  "3": "API Design",
};

export type StructuredFeedback = {
  score: number;
  summary: string;
  positives: string[];
  suggestions: string[];
};

export async function POST(request: NextRequest) {
  try {
    const {
      step,
      answer,
      problemId,
      problemTitle,
      problemDescription,
      constraints,
      studentName,
      attemptId,
    } = await request.json();

    const stepInstruction = STEP_INSTRUCTIONS[step];
    if (!stepInstruction) {
      return NextResponse.json(
        { error: "Invalid step" },
        { status: 400 }
      );
    }

    const problem = getProblem(problemId);
    const notes = problem?.coachingNotes?.[step];

    const constraintsContext = constraints?.length
      ? `\nSystem constraints (already revealed to student):\n${constraints.map((c: string) => `• ${c}`).join("\n")}`
      : "";

    // Build coaching context from problem-specific notes
    let coachingContext = "";
    if (notes) {
      coachingContext += "\n\n--- EVALUATION RUBRIC (use this to score) ---";
      if (notes.referencePoints.length > 0) {
        coachingContext += `\nReference answer should include:\n${notes.referencePoints.map((r: string) => `• ${r}`).join("\n")}`;
      }
      if (notes.outOfScope.length > 0) {
        coachingContext += `\nTopics the interviewer would typically place out of scope (for your reference only — do NOT penalize students for mentioning these. If a student includes them, treat it as bonus product thinking and celebrate it):\n${notes.outOfScope.map((o: string) => `• ${o}`).join("\n")}`;
      }
      if (notes.signals.length > 0) {
        coachingContext += `\nSignals to check for:\n${notes.signals.map((s: string) => `• ${s}`).join("\n")}`;
      }
      coachingContext += "\n--- END RUBRIC ---";
    }

    // Look up previous submission for retry-aware feedback
    const sessionId = request.cookies.get("session_id")?.value || "";
    let previousAttemptContext = "";
    if (sessionId) {
      const prev = getPreviousSubmission(sessionId, problemId, step);
      if (prev) {
        try {
          const prevFeedback = JSON.parse(prev.feedback);
          previousAttemptContext = `\n\n--- PREVIOUS ATTEMPT (acknowledge improvements) ---
Previous answer: ${prev.answer}
Previous score: ${prevFeedback.score}/4
Previous suggestions: ${prevFeedback.suggestions?.join("; ") || "none"}
---
This is a retry. Acknowledge specific improvements the student made since their last attempt. Be explicit about what's still missing.`;
        } catch {
          // If feedback parsing fails, skip previous context
        }
      }
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `You are a system design interview coach evaluating a student's answer. Use the provided rubric to evaluate precisely — check each signal and reference point.

Return your evaluation as a JSON object with this exact structure:
{
  "score": <1-4>,
  "summary": "<one sentence overall assessment>",
  "positives": ["<specific thing they did well>", ...],
  "suggestions": ["<specific actionable improvement>", ...]
}

Scoring guide:
- 1: Truly sparse (1 item) or completely off-topic
- 2: Has some right ideas but missing important elements or too vague
- 3: Good answer covering most key points with minor gaps
- 4: Excellent answer hitting all key signals, well-structured and specific

Important scoring floor: A student who lists 3+ relevant items for a step should never score below 2, even if they haven't hit the specific rubric signals. Reserve score 1 for answers that have only 1 item or are fundamentally off-topic.

Tone:
- Be encouraging, especially for lower scores. These are students learning — frame gaps as opportunities, not failures.
- For score 1-2: acknowledge what they got right (even if small), then guide them clearly toward what a stronger answer looks like.
- For score 3-4: be specific about what made their answer strong so they know what to repeat.

Rules:
- Each positive/suggestion must reference something specific from the student's answer or the rubric
- Don't give credit for vague statements — "low latency" without a target is not specific
- Keep positives to 2-4 items, suggestions to 0-3 items
- If the answer is excellent (score 4), instead of filler suggestions, point forward to how this step connects to the next phase (e.g. "In Core Entities, think about how the read-heavy pattern you identified will influence your data model"). If there's nothing meaningful to suggest, use 0 suggestions rather than forcing weak ones.
- Do NOT suggest something the student already included in their answer. Read the answer carefully before writing suggestions.
- IMPORTANT: If the student includes reasonable points beyond the rubric (e.g. optional features, edge cases, out-of-scope items), this is a POSITIVE sign of product thinking. Celebrate it in the positives list. NEVER penalize, dock points, or frame extra ideas as "bloat", "scope creep", or "too many items." Do NOT suggest the student should have fewer requirements or should separate core from stretch — having more good ideas is always better. A student who covers the core requirements AND adds thoughtful extras deserves a higher score, not a lower one. The score should be based on whether they hit the required reference points — extras only help, never hurt.
- Do NOT suggest "organizing", "labeling", "distinguishing", or "separating" core requirements from nice-to-haves, stretch goals, or extras. The student's job is to think of good ideas — categorization is not a signal we evaluate.
- Do NOT suggest the student should have asked the interviewer instead of including something. This is a practice tool, not a live interview.
- Do NOT suggest that including additional requirements "risks misaligning priorities" or similar. In a real interview, the interviewer would simply tell them what's out of scope. Here, showing you've thought beyond the basics is a strength.
- For the Core Entities step: extra entities beyond the rubric are great (product thinking). However, if the student writes full database column types, constraints, or schema DDL (e.g. "varchar(255) NOT NULL"), gently note that at this stage of a system design interview, identifying the right entities and their relationships matters more than column-level detail — they can flesh out the schema during high-level design. This is not a penalty, just coaching on interview pacing.
- Do NOT give stylistic or formatting nitpicks (e.g. "use 'should be able to' instead of 'can'", bullet formatting, wording choices). Focus only on substance — what they included, what they missed, and whether their thinking is sound.
- Return ONLY the JSON object, no other text`,
      messages: [
        {
          role: "user",
          content: `Problem: ${problemTitle}
${problemDescription}${constraintsContext}

Step: ${stepInstruction}${coachingContext}${previousAttemptContext}

Student's answer:
${answer}

Evaluate this answer and return JSON.`,
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the structured feedback — strip markdown fences if present
    let structured: StructuredFeedback;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      structured = JSON.parse(cleaned);
    } catch {
      // If parsing fails, wrap the raw text as a fallback
      structured = {
        score: 2,
        summary: rawText.slice(0, 200),
        positives: [],
        suggestions: [rawText],
      };
    }

    // Save to database
    saveSubmission({
      sessionId,
      attemptId: attemptId || "",
      studentName: studentName || anonymousName(sessionId),
      problemId: problemId || "unknown",
      problemTitle: problemTitle || "Unknown",
      step,
      stepLabel: STEP_LABELS[step] || step,
      answer,
      feedback: JSON.stringify(structured),
    });

    return NextResponse.json({ feedback: structured });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
