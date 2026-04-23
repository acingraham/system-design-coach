"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { Problem } from "@/lib/problems";
import { generateUUID } from "@/lib/uuid";
import {
  Step,
  Answers,
  EMPTY,
  STEPS,
  PHASES,
  Phase,
  findPhase,
  isMeaningfulScaleQuestion,
  buildInterviewerScaleAnswer,
  NOT_SCALE_FEEDBACK,
} from "@/lib/steps";
import { getFeedback, StructuredFeedback } from "@/lib/getFeedback";
import FeedbackCard from "@/app/components/FeedbackCard";

type PastSubmission = {
  id: number;
  attempt_id: string;
  step: string;
  step_label: string;
  answer: string;
  feedback: string;
  created_at: string;
};

/** Group submissions into attempts by attempt_id (or time proximity for legacy data). */
function groupAttempts(submissions: PastSubmission[]) {
  const chronological = [...submissions].reverse();
  const attemptOrder: string[] = [];
  const attemptMap: Record<string, PastSubmission[]> = {};
  let currentUntaggedKey: string | null = null;
  let lastUntaggedTime = 0;

  for (const sub of chronological) {
    let key: string;
    if (sub.attempt_id) {
      key = sub.attempt_id;
      currentUntaggedKey = null;
    } else {
      const subTime = new Date(sub.created_at + "Z").getTime();
      if (
        currentUntaggedKey &&
        subTime - lastUntaggedTime < 30 * 60 * 1000
      ) {
        key = currentUntaggedKey;
      } else {
        key = `legacy-${sub.id}`;
        currentUntaggedKey = key;
      }
      lastUntaggedTime = subTime;
    }

    if (!attemptMap[key]) {
      attemptMap[key] = [];
      attemptOrder.push(key);
    }
    attemptMap[key].push(sub);
  }

  // Most recent first
  attemptOrder.reverse();
  return { attemptOrder, attemptMap };
}

export default function RequirementsForm({ problem }: { problem: Problem }) {
  const searchParams = useSearchParams();
  const isNewSession = searchParams.get("new") === "1";

  const [studentName, setStudentName] = useState("");
  const [attemptId, setAttemptId] = useState(() => generateUUID());
  const [activeStep, setActiveStep] = useState<Step>("1A");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [feedback, setFeedback] = useState<
    Partial<Record<Exclude<Step, "done">, StructuredFeedback>>
  >({});
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState<PastSubmission[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedPastId, setExpandedPastId] = useState<number | null>(null);
  const [anonName, setAnonName] = useState("");
  const hasAutoLoaded = useRef(isNewSession);

  useEffect(() => {
    const saved = localStorage.getItem("studentName");
    if (saved) setStudentName(saved);

    // Fetch anonymous name for this session
    fetch("/api/name")
      .then((res) => res.json())
      .then((data) => setAnonName(data.name))
      .catch(() => {});

    // Fetch past submissions for this problem
    fetch(`/api/history?problem=${problem.id}`)
      .then((res) => res.json())
      .then((data) => setPastSubmissions(data.submissions))
      .catch(() => {});
  }, [problem.id]);

  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleNameChange(name: string) {
    setStudentName(name);
    localStorage.setItem("studentName", name);
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      fetch("/api/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => {});
    }, 500);
  }

  const current = activeStep === "done" ? null : STEPS[activeStep];
  const currentValue = current ? answers[current.field] : "";
  const showTextarea = !!current && (!currentValue || isEditing);

  const isStepAnswered = (s: Step) => {
    if (s === "done") return false;
    if (s === "1B") return answers.scaleAnswer !== "";
    return answers[STEPS[s].field] !== "";
  };
  const isPhaseComplete = (p: Phase) => p.steps.every(isStepAnswered);
  const phasesComplete = PHASES.filter(isPhaseComplete).length;
  const hasProgress = PHASES.some((p) => p.steps.some(isStepAnswered));

  const allSteps: Exclude<Step, "done">[] = PHASES.flatMap((p) => p.steps);
  const firstUnanswered = allSteps.find((s) => !isStepAnswered(s));
  const isStepUnlocked = (s: Exclude<Step, "done">) =>
    isStepAnswered(s) || s === firstUnanswered;

  const activePhase =
    activeStep === "done" ? null : findPhase(activeStep);
  const headingText =
    current && activePhase
      ? activePhase.steps.length === 1
        ? activePhase.label
        : `${activePhase.label} · ${current.sidebarLabel}`
      : "";

  function selectStep(step: Step) {
    setActiveStep(step);
    setIsEditing(false);
    setDraft("");
    setShowSampleAnswer(false);
  }

  function startEditing() {
    setDraft(currentValue);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setDraft("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current || activeStep === "done" || !draft.trim()) return;
    const value = draft.trim();
    const stepKey = activeStep;
    const meaningfulScale =
      stepKey === "1B" ? isMeaningfulScaleQuestion(value) : true;

    setAnswers((prev) => ({
      ...prev,
      [current.field]: value,
      ...(stepKey === "1B"
        ? {
            scaleAnswer: meaningfulScale
              ? buildInterviewerScaleAnswer(problem)
              : "",
          }
        : {}),
    }));
    setDraft("");
    setIsEditing(false);

    if (stepKey === "1B" && !meaningfulScale) {
      setFeedback((prev) => ({
        ...prev,
        [stepKey]: {
          score: 1,
          summary: "Not a scale question.",
          positives: [],
          suggestions: [NOT_SCALE_FEEDBACK],
        },
      }));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoadingFeedback(true);
    try {
      const constraintsToSend = answers.scaleAnswer ? problem.constraints : null;
      const result = await getFeedback(stepKey, value, problem, constraintsToSend, studentName, attemptId, controller.signal);
      setFeedback((prev) => ({ ...prev, [stepKey]: result }));
    } catch {
      // Aborted — do nothing
    } finally {
      setIsLoadingFeedback(false);
      abortRef.current = null;
    }
  }

  function handleCancelFeedback() {
    abortRef.current?.abort();
    setIsLoadingFeedback(false);
    abortRef.current = null;
  }

  function handleContinue() {
    if (!current) return;
    setActiveStep(current.next);
    setDraft("");
    setIsEditing(false);
  }

  function handleRestart() {
    setAttemptId(generateUUID());
    setActiveStep("1A");
    setAnswers(EMPTY);
    setFeedback({});
    setDraft("");
    setIsEditing(false);
    setIsLoadingFeedback(false);
    // Refresh history
    fetch(`/api/history?problem=${problem.id}`)
      .then((res) => res.json())
      .then((data) => setPastSubmissions(data.submissions))
      .catch(() => {});
  }

  // Auto-load the most recent attempt on first mount
  useEffect(() => {
    if (hasAutoLoaded.current || pastSubmissions.length === 0) return;
    hasAutoLoaded.current = true;
    const { attemptOrder } = groupAttempts(pastSubmissions);
    if (attemptOrder.length > 0) {
      loadPastAttempt(attemptOrder[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastSubmissions]);

  function loadPastAttempt(attemptKey: string) {
    const { attemptMap } = groupAttempts(pastSubmissions);
    const attemptSubs = attemptMap[attemptKey];
    if (!attemptSubs || attemptSubs.length === 0) return;

    const stepOrder = ["1A", "1B", "1C", "2", "3"];

    // Build a map of step → submission for this attempt
    const subByStep: Record<string, PastSubmission> = {};
    for (const sub of attemptSubs) {
      subByStep[sub.step] = sub;
    }

    // Build answers and feedback
    const newAnswers = { ...EMPTY };
    const newFeedback: Partial<Record<Exclude<Step, "done">, StructuredFeedback>> = {};

    for (const stepId of stepOrder) {
      const sub = subByStep[stepId];
      if (!sub) continue;

      const step = stepId as Exclude<Step, "done">;
      const config = STEPS[step];
      newAnswers[config.field] = sub.answer;

      if (step === "1B" && isMeaningfulScaleQuestion(sub.answer)) {
        newAnswers.scaleAnswer = buildInterviewerScaleAnswer(problem);
      }

      try {
        const parsed = JSON.parse(sub.feedback);
        if (typeof parsed === "object" && "score" in parsed) {
          newFeedback[step] = parsed;
        }
      } catch {}
    }

    setAnswers(newAnswers);
    setFeedback(newFeedback);
    setDraft("");
    setIsEditing(false);
    setShowSampleAnswer(false);
    // Reuse the loaded attempt's ID so continuing or editing stays in the same attempt
    setAttemptId(attemptSubs[0].attempt_id || generateUUID());

    // Navigate to the first unanswered step, or "done"
    const firstEmpty = stepOrder.find((s) => {
      if (s === "1B") return !newAnswers.scaleAnswer;
      return !newAnswers[STEPS[s as Exclude<Step, "done">].field];
    });
    setActiveStep((firstEmpty as Step) || "done");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim()) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-10 lg:self-start">
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Your Name
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={anonName || "Enter your name"}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Phases
          </h2>
          <span className="text-xs text-gray-500">
            {phasesComplete}/{PHASES.length}
          </span>
        </div>

        <ol className="mt-3 space-y-4">
          {PHASES.map((phase) => {
            const phaseDone = isPhaseComplete(phase);
            const singleStep = phase.steps.length === 1;

            if (singleStep) {
              const s = phase.steps[0];
              const answered = isStepAnswered(s);
              const isActive = s === activeStep;
              const unlocked = isStepUnlocked(s);
              return (
                <li key={phase.id}>
                  <button
                    type="button"
                    onClick={() => selectStep(s)}
                    disabled={!unlocked}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : unlocked
                          ? "text-gray-700 hover:bg-gray-100"
                          : "cursor-not-allowed text-gray-400"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                        isActive
                          ? "bg-white text-indigo-600"
                          : answered
                            ? "bg-green-600 text-white"
                            : unlocked
                              ? "bg-gray-200 text-gray-600"
                              : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {answered && !isActive
                        ? "✓"
                        : !unlocked
                          ? "🔒"
                          : phase.number}
                    </span>
                    <span className="flex-1 font-medium">{phase.label}</span>
                  </button>
                </li>
              );
            }

            // Multi-step phase: header + sub-steps
            const doneCount = phase.steps.filter(isStepAnswered).length;
            return (
              <li key={phase.id}>
                <div className="flex items-center gap-3 px-3 py-1">
                  <span
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                      phaseDone
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {phaseDone ? "✓" : phase.number}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {phase.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {doneCount}/{phase.steps.length}
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5 pl-5">
                  {phase.steps.map((s) => {
                    const answered = isStepAnswered(s);
                    const isActive = s === activeStep;
                    const unlocked = isStepUnlocked(s);
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => selectStep(s)}
                          disabled={!unlocked}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition ${
                            isActive
                              ? "bg-indigo-600 text-white"
                              : unlocked
                                ? "text-gray-600 hover:bg-gray-100"
                                : "cursor-not-allowed text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 flex-none rounded-full ${
                              isActive
                                ? "bg-white"
                                : answered
                                  ? "bg-green-600"
                                  : unlocked
                                    ? "bg-gray-300"
                                    : "bg-gray-200"
                            }`}
                          />
                          <span className="flex-1">
                            {STEPS[s].sidebarLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setTipsOpen((v) => !v)}
            aria-expanded={tipsOpen}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tips
            </span>
            <span className="text-xs text-gray-500">
              {tipsOpen ? "Hide ▾" : "Show ▸"}
            </span>
          </button>
          {tipsOpen && (
            <ul className="list-disc space-y-2 px-3 pb-3 pl-7 text-xs text-gray-700">
              {problem.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>

        {pastSubmissions.length > 0 && (() => {
          const { attemptOrder, attemptMap } = groupAttempts(pastSubmissions);

          return (
            <div className="mt-6 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Previous Attempts
                </span>
                <span className="text-xs text-gray-500">
                  {historyOpen ? "Hide ▾" : `${attemptOrder.length} ▸`}
                </span>
              </button>
              {historyOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {attemptOrder.map((attemptKey, idx) => {
                    const subs = attemptMap[attemptKey];
                    const date = new Date(subs[0].created_at + "Z");
                    const isExpanded = expandedPastId === subs[0].id;

                    return (
                      <div key={attemptKey} className="rounded border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPastId(isExpanded ? null : subs[0].id)
                          }
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                        >
                          <span className="flex-1 font-medium text-gray-700">
                            Attempt {attemptOrder.length - idx}
                          </span>
                          <span className="text-gray-400">
                            {date.toLocaleDateString()}
                          </span>
                          <span className="text-gray-400">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-2 pb-2 pt-1.5 space-y-1.5">
                            {subs.map((sub) => {
                              let score: number | null = null;
                              try {
                                const parsed = JSON.parse(sub.feedback);
                                if (parsed?.score) score = Math.round(parsed.score);
                              } catch {}

                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center gap-2 text-xs text-gray-700"
                                >
                                  <span className="flex-1 truncate">
                                    {sub.step_label}
                                  </span>
                                  {score && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
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
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => loadPastAttempt(attemptKey)}
                              className="mt-1 w-full rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                            >
                              Load this attempt
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {hasProgress && (
          <button
            type="button"
            onClick={handleRestart}
            className="mt-6 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            ↺ Restart
          </button>
        )}
      </aside>

      {/* Main */}
      <div className="space-y-8">
        {/* Problem card */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight">{problem.title}</h1>
          <p className="mt-2 text-gray-600">{problem.description}</p>

          {answers.scaleAnswer && activeStep !== "1B" && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Constraints
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800">
                {problem.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </header>

        {/* Stage panel */}
        {current ? (
          <section>
            <h2 className="text-xl font-semibold">{headingText}</h2>
            <p className="mt-1 mb-5 text-sm text-gray-600">{current.prompt}</p>

            {showTextarea ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={8}
                  autoFocus
                  placeholder={current.placeholder}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {current.cta}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    ⌘ + Enter to submit
                  </span>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {activeStep === "1B" ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-medium text-gray-500">
                      You asked
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                      {answers.scaleQuestion}
                    </p>
                    {answers.scaleAnswer && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-500">
                          Interviewer
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                          {answers.scaleAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {currentValue}
                    </p>
                  </div>
                )}

                {isLoadingFeedback && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 animate-pulse">
                        Generating feedback...
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelFeedback}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!isLoadingFeedback && activeStep !== "done" && feedback[activeStep] && (
                  <FeedbackCard feedback={feedback[activeStep]} />
                )}

                {!isLoadingFeedback &&
                  activeStep !== "done" &&
                  feedback[activeStep] &&
                  problem.coachingNotes?.[activeStep]?.sampleAnswer && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowSampleAnswer((v) => !v)}
                        className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                      >
                        {showSampleAnswer
                          ? "Hide Sample Answer"
                          : "View Sample Answer"}
                      </button>
                      {showSampleAnswer && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Sample Answer
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-green-900">
                            {problem.coachingNotes[activeStep]!.sampleAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {!isLoadingFeedback && (
                  <div className="flex items-center gap-3">
                    {isStepAnswered(activeStep) && (
                      <button
                        type="button"
                        onClick={handleContinue}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        {current.next === "done" ? "Finish" : "Continue"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={startEditing}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {isStepAnswered(activeStep) ? "Edit" : "Try Again"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-lg border border-green-200 bg-green-50 p-6 text-sm text-green-900">
            <div className="font-semibold">All phases complete.</div>
            <p className="mt-1">
              Click any step in the sidebar to review or edit your answer.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
