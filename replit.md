# Workspace

## Overview

**Mind Forge** - a full-stack student productivity web application with AI-powered quiz generation, notes management, study timetable, goals tracking, mood check-in, calendar, minigames, XP/level progression, friends & chat system (with message delete/edit/lightbox), public user profiles, achievements, cosmetics shop, gamification (bonus points, power-ups, streaks), inbox, review system, and country/grade onboarding with grade-change request workflows.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/study-smart)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/           # Express API server (port from env PORT)
│   └── study-smart/          # React + Vite frontend (previewPath: /)
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval codegen config
│   ├── api-client-react/     # Generated React Query hooks
│   ├── api-zod/              # Generated Zod schemas from OpenAPI
│   ├── db/                   # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server integration
│   └── integrations-openai-ai-react/   # OpenAI React integration
├── scripts/                  # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

1. **Notes & Subjects** - Organize notes by subject folders, create/edit/delete notes; public account users can share notes publicly (AI-moderated via GPT)
2. **Community Notes** - Publicly shared notes from public-account users, AI-verified for accuracy and appropriateness
3. **AI Quiz Generator** - Generate multiple-choice quizzes from notes (Easy/Normal/Difficult); scoring formula `2 * correct * x` where x = XP_BASE + difficulty offset; wrong answers tracked
4. **Review System** - Wrong-answer review page (`/review`); mark as mastered or review later
5. **Weekly Timetable** - Schedule study sessions by day, browser push notifications
6. **Goals** - Set goals with deadlines, descriptions, mark complete/incomplete
7. **Calendar** - Monthly view with schedules and goal deadlines
8. **Mood Check-in** - Daily mood tracking with history
9. **Minigames** - Memory Match and Bubble Pop with leaderboard scores
10. **Leaderboard** - Global leaderboard by game type and quiz scores, filtered by education level
11. **XP & Game Levels** - Earn XP on quiz completion; 100 game levels with thresholds
12. **Friends** - Send/accept/decline friend requests, view friend profiles
13. **Chat** - Real-time messaging between friends; typing indicators; message costs bonus points
14. **Public Profiles** - View other users' profiles with achievements, stats, equipment; shows country/grade badge
15. **Achievements** - 30+ achievements auto-awarded on various milestones
16. **Shop** - Spend bonus points on cosmetics (backgrounds, frames, nametags); equip/unequip items
17. **Inbox** - Notifications for gifts, chat warnings, grade change results, friend requests, achievements, and promotions
18. **Power-ups** - Streak Freeze, Double Points Boost, Hint Token, Retry Pass; apply in quiz settings
19. **Gamification** - Bonus points, XP, streaks, daily check-ins; Random Quiz Bonus
20. **Developer Panel** - Gift all users, gift specific user (points/power-up/free messages), promote users to developer, review grade change requests
23. **Support Us** - Donation page (`/support`) with Stripe-powered one-time payments; tiers: Supporter $2, Champion $5, Legend $10
21. **Country & Grade System** - Multi-step signup (country → grade → account); ~50 countries with full grade systems; auto-advance on login each school year; grade change request workflow with developer approval; profile shows country flag + current grade
22. **Preferences** - Theme (light/dark/system), language, privacy settings, profile visibility

## Database Schema

- `users` - User accounts (`id` varchar UUID, `username`, `passwordHash`, `level`, `xp`, `gameLevel`, `bonusPoints`, `isDeveloper`, `country`, `gradeIndex`, `gradeSchoolYear`, equipped cosmetics, privacy settings)
- `subjects` - Subject folders (name, color, icon)
- `notes` - Study notes (title, content, subjectId, userId, isPublic, moderationStatus, moderationNote, lastUsedAt)
- `schedules` - Study schedules (subject, dayOfWeek, startTime, endTime, color, notificationEnabled, eventType)
- `goals` - Study goals (title, description, deadline, completed)
- `moods` - Mood check-ins (mood enum, note, createdAt)
- `scores` - Game/quiz leaderboard scores (userId, gameType, score, subject, userLevel)
- `user_achievements` - Earned achievements per user (userId, achievementKey, earnedAt)
- `shop_items` - Cosmetic items (key, name, type, price, rarity, description)
- `user_shop_items` - User-owned and equipped shop items
- `friendships` - Friend relationships (requesterId, addresseeId, status)
- `chat_messages` - Direct messages between friends (senderId, recipientId, content, mediaUrl, readAt)
- `inbox_messages` - System notifications (recipientId, senderId, type, message, status, readAt)
- `user_powerups` - User power-up inventory (userId, type, count)
- `review_items` - Wrong answers saved for review (userId, noteId, question, answer, status)
- `grade_change_requests` - Grade change workflow (userId, country, currentGradeIndex, requestedGradeIndex, currentGradeName, requestedGradeName, reason, status, reviewedAt)
- `stripe.*` schema - Managed by stripe-replit-sync (products, prices, customers, subscriptions, etc.)
- `users.stripe_customer_id` - VARCHAR column on users table for Stripe customer ID linkage

## API Routes (all under /api)

### Auth
- `POST /auth/register` — register with username, password, optional country+gradeIndex
- `POST /auth/login` — login; auto-advances grade if school year has changed
- `POST /auth/logout`
- `GET /auth/session`
- `PUT /auth/profile` — update profile settings
- `PUT /auth/password` — change password
- `DELETE /auth/account`

### Notes & Subjects
- `GET/POST /subjects`, `PUT/DELETE /subjects/:id`
- `GET/POST /notes`, `GET/PUT/DELETE /notes/:id`
- `GET /notes/community`
- `POST /notes/:id/publish`, `DELETE /notes/:id/unpublish`
- `POST /notes/:id/quiz` — AI quiz generation

### Timetable, Goals, Calendar, Moods
- `GET/POST /schedules`, `PUT/DELETE /schedules/:id`
- `GET/POST /goals`, `PUT/DELETE /goals/:id`
- `GET/POST /moods`

### Game & Scores
- `POST /games/score` — submit game score
- `GET /leaderboard` — all-time leaderboards

### Quiz
- `GET /quiz/subjects` — subjects with notes for quiz
- `POST /curriculum-quiz` — AI curriculum quiz (no notes needed)
- `POST /quiz/random-bonus` — random bonus before quiz

### Review
- `GET /review` — list review items
- `POST /review` — save wrong answer for review
- `PUT /review/:id` — update status (mastered/review_later)
- `DELETE /review/:id`

### Social
- `GET /users`, `GET /users/:userId`
- `GET/POST /friends`, `PUT /friends/:id`, `DELETE /friends/:id`
- `GET/POST /chat/:friendId`, `PUT /chat/:friendId/read`

### Inbox
- `GET /inbox`, `PUT /inbox/:id/read`, `DELETE /inbox/:id`

### Shop & Achievements
- `GET /shop`, `POST /shop/buy`, `POST /shop/equip`
- `GET /achievements`

### Power-ups
- `GET /powerups`, `POST /powerups/use`

### Grade Change
- `POST /grade-change-request` — submit grade change request
- `GET /grade-change-requests` — list all (developer only)
- `PUT /grade-change-requests/:id` — approve or decline (developer only)

### Developer
- `GET /developer/users`
- `POST /developer/gift-all`
- `POST /developer/request-promote`

### Chat Attachments (Media Uploads — DB-backed)
- `POST /attachments` — accepts `multipart/form-data` with a `file` field (max 8 MB); stores as base64 in `chat_attachments` DB table; returns `{ id, mediaUrl }` where `mediaUrl = /api/attachments/:id?t=<mediaType>`
- `GET /attachments/:id` — serves the attachment (requires auth); reads from `chat_attachments` DB table; streams raw bytes with correct `Content-Type`

**Upload flow**: client POSTs FormData to `/api/attachments` → DB stores base64 → `mediaUrl` returned → stored in `chat_messages.media_url` → rendered via `AuthMedia` component which fetches with auth headers
**Media type detection**: `mediaUrl` contains `?t=image` or `?t=video` suffix for display routing
**Note**: GCS/Replit object storage sidecar is broken (returns 401 "no allowed resources" — platform issue); the DB-backed approach above is the replacement

### Object Storage (Legacy — Broken)
- `POST /storage/uploads/request-url` — GCS presigned URL (broken: sidecar auth fails)
- `GET /storage/objects/*` — GCS file serve (broken: sidecar auth fails)

## Key Implementation Notes

- **customFetch** — returns parsed data directly, throws `ApiError` on non-OK. Never check `.ok` or call `.json()` on result
- **Quiz scoring**: `calcScore(correct, levelGroup, difficulty)` → `2 * c * x`; failed quiz (score=0) → flat 2 pts + encouraging message; Double Points doesn't apply to consolation
- **Difficulty values** in DB/API: `"easy"`, `"normal"`, `"difficult"` (NOT "hard")
- **Grade auto-advance**: on each login, if `currentSchoolYear(startMonth) > gradeSchoolYear`, grade increments (capped at country max grade and 4-year advance)
- **APPROVER_ID** (`5705e7da-bb0b-47e5-8563-9bdd23b24973`) — Jasper Cheung's user ID, hardcoded in `developer.ts`, `inbox.ts`, `grade-change.ts`
- **DB schema changes**: use `executeSql` in code_execution sandbox; `pnpm --filter @workspace/db run push-force` hangs on prompts

## TypeScript & Composite Projects

- `lib/*` packages are composite and emit declarations via `tsc --build`
- Root `tsconfig.json` lists all lib packages as project references
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- DB push: `pnpm --filter @workspace/db run push`
