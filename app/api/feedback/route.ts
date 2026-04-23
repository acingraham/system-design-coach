import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { saveSubmission } from "@/lib/db";
import { getProblem } from "@/lib/problems";
import { anonymousName } from "@/lib/anonymousName";

const client = new Anthropic();

const STEP_INSTRUCTIONS: Record<string, string> = {
  "1A": `The student is listing functional requirements — what the system should do from a user's perspective.
Evaluate: Are the requirements specific and actionable? Did they identify the core features? Did they keep it focused (2-3 core requirements, not a long list)? Did they appropriately scope out non-core features?`,
  "1B": `The student is asking a clarifying question about the scale of the system.
Evaluate: Is the question specific and measurable? Does it target a dimension that would change the design (DAU, read/write ratio, total stored items, latency targets)? Would the answer meaningfully impact architecture decisions?`,
  "1C": `The student is identifying nonfunctional requirements — constraints like latency, availability, consistency, durability, etc.
Evaluate: Did they quantify their constraints with specific targets (not just "low latency")? Did they make explicit trade-offs (e.g. availability vs consistency)? Did they identify scale-related constraints?`,
  "2": `The student is identifying core entities (data models) in the system.
Evaluate: Did they identify the key entities? Are they kept simple as a first draft (not over-engineered)? Are relationships between entities clear? Did they avoid adding entities for out-of-scope features?`,
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
        coachingContext += `\nOut of scope (do NOT penalize the student for failing to mention these — they would only learn what's out of scope from the interviewer. Only flag it if the student explicitly includes these as core requirements):\n${notes.outOfScope.map((o: string) => `• ${o}`).join("\n")}`;
      }
      if (notes.signals.length > 0) {
        coachingContext += `\nSignals to check for:\n${notes.signals.map((s: string) => `• ${s}`).join("\n")}`;
      }
      coachingContext += "\n--- END RUBRIC ---";
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
- 1: Missing most key points, fundamentally incomplete
- 2: Has some right ideas but missing important elements or too vague
- 3: Good answer covering most key points with minor gaps
- 4: Excellent answer hitting all key signals, well-structured and specific

Rules:
- Each positive/suggestion must reference something specific from the student's answer or the rubric
- Don't give credit for vague statements — "low latency" without a target is not specific
- Keep positives to 2-4 items, suggestions to 1-3 items
- If the answer is excellent (score 4), suggestions can be minor polish items
- IMPORTANT: If the student includes reasonable points beyond the rubric (e.g. optional features, edge cases, out-of-scope items), this is a POSITIVE sign of product thinking. Celebrate it in the positives list. NEVER penalize, dock points, or frame extra ideas as "bloat" or "scope creep." A student who covers the core requirements AND adds thoughtful extras deserves a higher score, not a lower one. The score should be based on whether they hit the required reference points — extras only help, never hurt.
- Do NOT suggest the student should have asked the interviewer instead of including something. This is a practice tool, not a live interview.
- Do NOT suggest that including additional requirements "risks misaligning priorities" or similar. In a real interview, the interviewer would simply tell them what's out of scope. Here, showing you've thought beyond the basics is a strength.
- Do NOT give stylistic or formatting nitpicks (e.g. "use 'should be able to' instead of 'can'", bullet formatting, wording choices). Focus only on substance — what they included, what they missed, and whether their thinking is sound.
- Return ONLY the JSON object, no other text`,
      messages: [
        {
          role: "user",
          content: `Problem: ${problemTitle}
${problemDescription}${constraintsContext}

Step: ${stepInstruction}${coachingContext}

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
    const sessionId = request.cookies.get("session_id")?.value || "";
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
