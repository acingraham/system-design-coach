import Link from "next/link";
import { problems } from "@/lib/problems";
import { PHASES } from "@/lib/steps";

const PROBLEM_ICONS: Record<string, string> = {
  "url-shortener": "🔗",
  "chat-app": "💬",
  "twitter-feed": "📰",
  "uber-matching": "🚗",
};

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Master the System Design Interview
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Practice functional requirements, nonfunctional requirements, core
            entities, and API design — with AI-powered coaching.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href={`/problems/${problems[0].id}`}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Start Practicing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Full Practice */}
        <section id="problems">
          <h2 className="text-xl font-bold text-gray-900">Choose a Problem</h2>
          <p className="mt-1 text-sm text-gray-600">
            Pick a problem and work through all phases end to end.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {problems.map((p) => (
              <Link
                key={p.id}
                href={`/problems/${p.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-200"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" role="img" aria-label={p.title}>
                    {PROBLEM_ICONS[p.id] || "📋"}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {p.title}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                      {p.description}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Practice by Step */}
        <section className="mt-14">
          <h2 className="text-xl font-bold text-gray-900">Practice by Step</h2>
          <p className="mt-1 text-sm text-gray-600">
            Focus on one step and practice it across all problems.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PHASES.map((phase) => (
              <Link
                key={phase.id}
                href={`/practice/${phase.id}/${problems[0].id}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">
                  {phase.number}
                </div>
                <div className="mt-3 font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {phase.label}
                </div>
                <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                  {phase.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
