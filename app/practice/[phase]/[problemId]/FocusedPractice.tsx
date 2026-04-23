"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import type { Problem } from "@/lib/problems";
import {
  Step,
  Answers,
  EMPTY,
  STEPS,
  PHASES,
  isMeaningfulScaleQuestion,
  buildInterviewerScaleAnswer,
  NOT_SCALE_FEEDBACK,
} from "@/lib/steps";
import { getFeedback, StructuredFeedback } from "@/lib/getFeedback";
import FeedbackCard from "@/app/components/FeedbackCard";

type Props = {
  problem: Problem;
  phaseId: string;
  nextProblemId: string | null;
  problemIndex: number;
  totalProblems: number;
};

export default function FocusedPractice({
  problem,
  phaseId,
  nextProblemId,
  problemIndex,
  totalProblems,
}: Props) {
  const phase = PHASES.find((p) => p.id === phaseId)!;
  const phaseSteps = phase.steps;
  const showConstraintsUpfront = phaseId !== "requirements";

  const [studentName, setStudentName] = useState("");
  const [attemptId] = useState(() => crypto.randomUUID());
  const [activeStep, setActiveStep] = useState<Step>(phaseSteps[0]);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [feedback, setFeedback] = useState<
    Partial<Record<Exclude<Step, "done">, StructuredFeedback>>
  >({});
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [phaseDone, setPhaseDone] = useState(false);
  const [anonName, setAnonName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("studentName");
    if (saved) setStudentName(saved);

    fetch("/api/name")
      .then((res) => res.json())
      .then((data) => setAnonName(data.name))
      .catch(() => {});
  }, []);

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

  // Find the next step within this phase, or null if at the end
  function nextStepInPhase(): Step | null {
    if (activeStep === "done") return null;
    const idx = phaseSteps.indexOf(activeStep);
    if (idx === -1 || idx === phaseSteps.length - 1) return null;
    return phaseSteps[idx + 1];
  }

  const stepsCompleted = phaseSteps.filter(isStepAnswered).length;

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
      const constraintsToSend =
        showConstraintsUpfront || answers.scaleAnswer
          ? problem.constraints
          : null;
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
    const next = nextStepInPhase();
    if (next) {
      setActiveStep(next);
      setDraft("");
      setIsEditing(false);
      setShowSampleAnswer(false);
    } else {
      setPhaseDone(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim()) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  // Heading: "Requirements · Functional" for multi-step, "Core Entities" for single
  const headingText =
    current
      ? phaseSteps.length === 1
        ? phase.label
        : `${phase.label} · ${current.sidebarLabel}`
      : phase.label;

  return (
    <div className="space-y-8">
      {/* Header: problem info + progress */}
      <header>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Name
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={anonName || "Enter your name"}
            className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {phase.label} — Problem {problemIndex + 1} of {totalProblems}
          </div>
          {phaseSteps.length > 1 && (
            <span className="text-xs text-gray-400">
              {stepsCompleted}/{phaseSteps.length} steps
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {problem.title}
        </h1>
        <p className="mt-2 text-gray-600">{problem.description}</p>

        {/* Show constraints upfront for non-requirements phases,
            or after scale question for requirements phase */}
        {(showConstraintsUpfront || answers.scaleAnswer) && (
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

      {/* Step panel */}
      {!phaseDone && current ? (
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
                      {nextStepInPhase() ? "Continue" : "Finish"}
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
          <div className="font-semibold">
            {phase.label} complete for {problem.title}!
          </div>
          <div className="mt-4 flex items-center gap-3">
            {nextProblemId ? (
              <Link
                href={`/practice/${phaseId}/${nextProblemId}`}
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Next Problem →
              </Link>
            ) : (
              <div className="text-green-800">
                You&apos;ve completed {phase.label} for all problems.
              </div>
            )}
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Home
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
