import LiveFeed from "./LiveFeed";

export default function TeacherPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Live feed of student submissions. Updates every 5 seconds.
      </p>
      <div className="mt-8">
        <LiveFeed />
      </div>
    </main>
  );
}
