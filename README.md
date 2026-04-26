# System Design Coach

A web app that helps students practice the early phases of a system design interview — functional requirements, scale questions, nonfunctional requirements, core entities, and API design — with AI-powered feedback.

Built for classroom use. Students practice on their own; the teacher monitors progress in real time.

## Features

**Student experience:**
- Pick a problem (URL Shortener, Twitter Feed, Chat App, Uber Matching) and work through all phases end to end
- Or focus on one phase across all problems
- Submit answers and get immediate AI feedback with a 1-4 score, specific positives, and actionable suggestions
- Retry and see your score trajectory (e.g. 2/4 → 3/4 → 4/4)
- View sample answers after submitting
- Session-based identity with anonymous names (Misty Dove, Marble Jaguar, etc.)

**Teacher experience:**
- Live dashboard at `/teacher` with all student submissions (polls every 5s)
- Feed view (chronological) and Summary view (per-student score grid)
- Filter by problem, step, time range, or specific students
- Expand any submission to see the full answer and AI feedback

**AI coaching:**
- Per-problem, per-step rubrics with reference points, signals, and out-of-scope topics
- Retry-aware: when a student resubmits, the AI acknowledges what improved and pinpoints remaining gaps
- Celebrates extra ideas as product thinking, never penalizes
- Score 4 feedback points forward to the next phase instead of filler suggestions

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** better-sqlite3
- **AI:** Claude API (Sonnet 4.6) via Anthropic SDK
- **Styling:** Tailwind CSS
- **Deployment:** AWS Lightsail, PM2

## Getting Started

```bash
npm install
```

Create `.env.local` with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                    # Homepage with problem cards and step cards
  dashboard/                  # Student progress dashboard
  history/                    # Submission history
  teacher/                    # Teacher live feed + summary view
  problems/[id]/              # Full practice mode (all phases for one problem)
  practice/[phase]/[problemId]/ # Focused practice (one phase across problems)
  api/
    feedback/                 # AI feedback endpoint (Claude API)
    submissions/              # CRUD for submissions
    history/                  # Per-session submission history
    name/                     # Anonymous name generation + backfill
lib/
  problems.ts                 # Problem definitions, rubrics, coaching notes, sample answers
  steps.ts                    # Step config shared across practice modes
  db.ts                       # SQLite database operations
  anonymousName.ts            # Deterministic adjective + animal names from session ID
  getFeedback.ts              # Client-side feedback API wrapper
```

## Roadmap

### Up Next
- **NFR learning feature** — a separate experience (worked example, mini-guide, or quiz) that teaches students how to derive nonfunctional requirements from system characteristics, rather than scaffolding the practice step itself
- **Google OAuth login** — NextAuth + linking session_id to Google account for persistent identity across devices
- **UI/UX design pass** — shared nav polish, homepage hierarchy, spacing, cards, teacher summary bar, dark mode cleanup (currently uses fragile `!important` overrides — should migrate to Tailwind `dark:` variants)

### Future Ideas
- **Difficulty levels** — let students choose mid-level, senior, staff, etc. so feedback and expectations scale accordingly
- **High-level design step** — practice drawing system diagrams with embedded Excalidraw
- **Deep dive step** — practice drilling into a specific component (e.g. database schema, caching layer)
- **Beyond system design** — DSA problems, AI-enabled problems, low-level coding problems, coding competition arena and classroom features
- **Custom domain** — replace the raw IP address with a proper domain
- **Site redesign** — full design pass for a polished, production-quality look
- **Mobile-friendly** — audit and fix responsive layout for phone/tablet use
- **User accounts** — registration and login so progress persists across devices and sessions
- Coaching notes for remaining problems — only URL Shortener and Twitter Feed have full rubrics; Chat App and Uber Matching have rubrics but haven't been class-tested
- Student-to-student comparison view for the teacher
- Export class results (CSV or PDF)
- Timed practice mode to simulate interview pressure

## Deployment

SSH to the Lightsail instance and pull/build/restart:

```bash
ssh -i ~/.ssh/lightsail-sdc.pem ubuntu@34.198.26.219 \
  "cd /home/ubuntu/system-design-coach && git pull && npm run build && pm2 restart sdc"
```
