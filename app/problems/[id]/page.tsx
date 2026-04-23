import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProblem } from "@/lib/problems";
import RequirementsForm from "./RequirementsForm";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <Suspense>
          <RequirementsForm problem={problem} />
        </Suspense>
      </div>
    </main>
  );
}
