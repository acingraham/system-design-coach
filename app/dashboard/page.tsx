import Dashboard from "./Dashboard";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your Progress</h1>
      <p className="mt-2 text-sm text-gray-600">
        Track your progress across problems and steps.
      </p>
      <div className="mt-8">
        <Dashboard />
      </div>
    </main>
  );
}
