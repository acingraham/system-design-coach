import { notFound } from "next/navigation";
import { getProblem, getNextProblemId, problems } from "@/lib/problems";
import { getPhaseById } from "@/lib/steps";
import FocusedPractice from "./FocusedPractice";

export default async function FocusedPracticePage({
  params,
}: {
  params: Promise<{ phase: string; problemId: string }>;
}) {
  const { phase: phaseId, problemId } = await params;

  const phase = getPhaseById(phaseId);
  if (!phase) notFound();

  const problem = getProblem(problemId);
  if (!problem) notFound();

  const nextProblemId = getNextProblemId(problemId);
  const problemIndex = problems.findIndex((p) => p.id === problemId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div>
        <FocusedPractice
          problem={problem}
          phaseId={phaseId}
          nextProblemId={nextProblemId}
          problemIndex={problemIndex}
          totalProblems={problems.length}
        />
      </div>
    </main>
  );
}
