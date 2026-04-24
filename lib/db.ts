import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "submissions.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL DEFAULT '',
        attempt_id TEXT NOT NULL DEFAULT '',
        student_name TEXT NOT NULL,
        problem_id TEXT NOT NULL,
        problem_title TEXT NOT NULL,
        step TEXT NOT NULL,
        step_label TEXT NOT NULL,
        answer TEXT NOT NULL,
        feedback TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Migrations for existing DBs
    const columns = db.prepare("PRAGMA table_info(submissions)").all() as { name: string }[];
    if (!columns.some((c) => c.name === "session_id")) {
      db.exec("ALTER TABLE submissions ADD COLUMN session_id TEXT NOT NULL DEFAULT ''");
    }
    if (!columns.some((c) => c.name === "attempt_id")) {
      db.exec("ALTER TABLE submissions ADD COLUMN attempt_id TEXT NOT NULL DEFAULT ''");
    }
  }
  return db;
}

export type Submission = {
  id: number;
  session_id: string;
  attempt_id: string;
  student_name: string;
  problem_id: string;
  problem_title: string;
  step: string;
  step_label: string;
  answer: string;
  feedback: string;
  created_at: string;
};

export function saveSubmission(data: {
  sessionId: string;
  attemptId: string;
  studentName: string;
  problemId: string;
  problemTitle: string;
  step: string;
  stepLabel: string;
  answer: string;
  feedback: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO submissions (session_id, attempt_id, student_name, problem_id, problem_title, step, step_label, answer, feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.sessionId,
    data.attemptId,
    data.studentName,
    data.problemId,
    data.problemTitle,
    data.step,
    data.stepLabel,
    data.answer,
    data.feedback
  );
}

export function updateStudentName(sessionId: string, name: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE submissions SET student_name = ? WHERE session_id = ?`
  ).run(name, sessionId);
}

export function getSubmissions(since?: string): Submission[] {
  const db = getDb();
  if (since) {
    return db
      .prepare(
        `SELECT * FROM submissions WHERE created_at > ? ORDER BY created_at DESC`
      )
      .all(since) as Submission[];
  }
  return db
    .prepare(`SELECT * FROM submissions ORDER BY created_at DESC LIMIT 100`)
    .all() as Submission[];
}

export function getSubmissionsBySession(sessionId: string): Submission[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM submissions WHERE session_id = ? ORDER BY created_at DESC`
    )
    .all(sessionId) as Submission[];
}

export function getPreviousSubmission(
  sessionId: string,
  problemId: string,
  step: string
): Submission | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM submissions WHERE session_id = ? AND problem_id = ? AND step = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(sessionId, problemId, step) as Submission | undefined;
}

export function getSubmissionsBySessionAndProblem(
  sessionId: string,
  problemId: string
): Submission[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM submissions WHERE session_id = ? AND problem_id = ? ORDER BY created_at DESC`
    )
    .all(sessionId, problemId) as Submission[];
}
