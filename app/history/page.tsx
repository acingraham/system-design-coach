import HistoryList from "./HistoryList";

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">
        Your Submission History
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        All your past submissions and feedback from this browser.
      </p>
      <div className="mt-8">
        <HistoryList />
      </div>
    </main>
  );
}
