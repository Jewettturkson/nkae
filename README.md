# Nkae: AI-Powered Study Assistant

> Nkae (Twi: remembrance) turns your notes into AI summaries, flashcards, and quizzes, then brings you back at the right moment. Formerly Nkae. By Turk Labs.

**Live:** [nkae.study](https://nkae.study) (deployment in progress)

Nkae turns your study materials into an active-recall workflow. Upload notes or textbook chapters and the app generates summaries, spaced-repetition flashcards, and adaptive quizzes, then tracks sessions, goals, and daily stats so you can see the progress.

## Features

- **AI-generated summaries** from uploaded study materials
- **Smart flashcards** with a spaced-repetition algorithm
- **Adaptive quizzes** generated per subject and difficulty
- **Study sessions & goals** with daily statistics tracking
- **Auth-guarded API**: every study route requires a session; OpenAI calls happen server-side only

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query, Wouter |
| Backend | Node.js, Express, TypeScript (tsx / esbuild) |
| Database | PostgreSQL with Drizzle ORM (`users`, `subjects`, `study_materials`, `flashcards`, `quiz_questions`, `study_sessions`, `study_goals`, `daily_stats`) |
| AI | OpenAI API (server-side) |
| Auth | OpenID Connect (Replit Auth) with express-session backed by Postgres |

## API surface

REST endpoints under `/api`: `auth/user`, `subjects`, `study-materials`, `flashcards` + `flashcards/generate`, `quiz-questions` + `quiz-questions/generate`, `study-sessions`, and more: see `server/routes.ts`.

## Run locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, OPENAI_API_KEY, SESSION_SECRET
npm run db:push        # sync Drizzle schema to your database
npm run dev            # http://localhost:5000
```

Type check with `npm run check`; production build with `npm run build && npm start`.

## Design decisions

- **Server-side AI only.** The OpenAI key never reaches the browser; generation endpoints are authenticated and rate-limited by session.
- **Shared schema.** `shared/schema.ts` is the single source of truth for both Drizzle tables and client types.
- **Mobile-first.** Built for distraction-free studying on a phone, using active recall, spaced repetition, and Pomodoro-style sessions.

## License

MIT © Jewett Turkson
