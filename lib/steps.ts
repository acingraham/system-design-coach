import type { Problem } from "./problems";

export type Step = "1A" | "1B" | "1C" | "2" | "3" | "done";

export type Answers = {
  functional: string;
  scaleQuestion: string;
  scaleAnswer: string;
  nonfunctional: string;
  entities: string;
  api: string;
};

export const EMPTY: Answers = {
  functional: "",
  scaleQuestion: "",
  scaleAnswer: "",
  nonfunctional: "",
  entities: "",
  api: "",
};

export type StepConfig = {
  sidebarLabel: string;
  prompt: string;
  field: keyof Answers;
  next: Step;
  cta: string;
  placeholder: string;
};

export const STEPS: Record<Exclude<Step, "done">, StepConfig> = {
  "1A": {
    sidebarLabel: "Functional",
    prompt: "What should this system do?",
    field: "functional",
    next: "1B",
    cta: "Submit & Get Feedback",
    placeholder:
      "One capability per line, from the user's perspective. For example:\n- Users can upload a photo\n- Users can view photos from people they follow\n- Users can like and comment on photos",
  },
  "1B": {
    sidebarLabel: "Scale",
    prompt:
      "What question would you ask to clarify the scale of this system?",
    field: "scaleQuestion",
    next: "1C",
    cta: "Ask",
    placeholder:
      "Ask one specific question. For example:\nHow many daily active users should we support, and what's the read-to-write ratio?",
  },
  "1C": {
    sidebarLabel: "Nonfunctional",
    prompt:
      "What constraints matter? (latency, availability, consistency, etc.)",
    field: "nonfunctional",
    next: "2",
    cta: "Submit & Get Feedback",
    placeholder:
      "One constraint per line, with a target where possible. For example:\n- Feed loads in < 500ms (p99)\n- 99.9% availability\n- Eventual consistency acceptable for like counts",
  },
  "2": {
    sidebarLabel: "Core Entities",
    prompt: "What are the core entities in this system?",
    field: "entities",
    next: "3",
    cta: "Continue",
    placeholder:
      "One entity per line with its key fields. For example:\n- User: id, username, bio\n- Photo: id, authorId, url, createdAt\n- Like: userId, photoId",
  },
  "3": {
    sidebarLabel: "API Design",
    prompt: "Sketch the API — endpoints, inputs, outputs.",
    field: "api",
    next: "done",
    cta: "Finish",
    placeholder:
      "One endpoint per line: METHOD /path { input } → { output }. For example:\nPOST /photos { url, caption } → { photoId }\nGET /feed?cursor=... → { photos, nextCursor }\nPOST /photos/:id/likes → 200",
  },
};

export type Phase = {
  id: string;
  number: number;
  label: string;
  description: string;
  steps: Exclude<Step, "done">[];
};

export const PHASES: Phase[] = [
  {
    id: "requirements",
    number: 1,
    label: "Requirements",
    description: "Practice defining functional requirements, asking scale questions, and identifying nonfunctional constraints.",
    steps: ["1A", "1B", "1C"],
  },
  {
    id: "entities",
    number: 2,
    label: "Core Entities",
    description: "Practice identifying the key data models and their relationships.",
    steps: ["2"],
  },
  {
    id: "api",
    number: 3,
    label: "API Design",
    description: "Practice sketching endpoints, inputs, and outputs.",
    steps: ["3"],
  },
];

export function findPhase(step: Exclude<Step, "done">): Phase {
  return PHASES.find((p) => p.steps.includes(step))!;
}

export function getPhaseById(phaseId: string): Phase | undefined {
  return PHASES.find((p) => p.id === phaseId);
}

// --- Scale question validation ---

const SCALE_KEYWORDS_REGEX =
  /\b(users?|dau|mau|wau|active|traffic|requests?|scale|load|volume|concurrent|peak|throughput|qps|rps|rate|bandwidth|growth|reads?|writes?|ratio|latency|storage)\b/i;

export function isMeaningfulScaleQuestion(text: string): boolean {
  return SCALE_KEYWORDS_REGEX.test(text);
}

export const NOT_SCALE_FEEDBACK =
  "That question isn't clearly about scale. Try asking something specific to system size or load — number of users, read/write ratio, peak traffic, storage footprint, etc. A good scale question helps you size infrastructure and make the right trade-offs.";

export function buildInterviewerScaleAnswer(problem: Problem): string {
  const intro = "Here's what you can assume about this system:";
  const bullets = problem.constraints.map((c) => `• ${c}`).join("\n");
  return `${intro}\n${bullets}`;
}

// --- Placeholder feedback ---

export const FEEDBACK_PLACEHOLDERS: Record<Exclude<Step, "done">, string> = {
  "1A":
    "Nice start on the functional requirements. Consider whether you've captured both the primary user actions and any system-side behaviors (notifications, background jobs, etc). Are there edge cases — like what happens when a user is offline, or deletes their account — worth calling out?",
  "1B":
    "Good clarifying question. Asking about scale early keeps you from over- or under-engineering. A strong follow-up would be asking about peak load vs. average load.",
  "1C":
    "You've identified key nonfunctional constraints. Double-check which ones have hard SLAs versus soft targets, and whether any of them conflict — e.g. strong consistency vs. low latency across regions.",
  "2":
    "Your entities cover the main nouns. Make sure relationships between them are explicit (one-to-many? many-to-many?), and consider whether any standard fields are missing — timestamps, soft-delete flags, or ownership references.",
  "3":
    "Your API covers the core operations. Think about pagination for list endpoints, error responses, and authentication. Are there batch or bulk operations worth exposing? What about idempotency for writes?",
};
