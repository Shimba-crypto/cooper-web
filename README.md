# CooperWeb — ECZ Grade 7 Past Papers & Quizzes

A Vite + React + TypeScript platform for Zambian ECZ Grade 7 past papers,
timed quizzes, mock exams, challenges, leaderboard, group chat and admin
management. All data lives in Firebase Realtime Database — no dummy data.

Live: https://chikondi-dot.web.app · Source: https://github.com/Shimba-crypto/cooper-web

## Features

- Past papers grid with search + filters (subject, year, paper type)
- Paper detail page: PDF link, 5-star rating, social share
- Quizzes with multiple-choice questions, instant results with explanations
- **Full-length practice quizzes** (50–60 questions per subject)
- Global leaderboard (scores saved per user)
- Bookmarks, ratings and study dashboard (localStorage)
- **Notes** with categories, search and text-to-speech read-aloud
- **Progress reports** and daily goals (streaks)
- **Groups & chat** (real-time, Firebase Realtime Database)
- **Challenges** (invite link, guest auto-join, per-player submissions)
- **Refer & Earn** (referral codes, tracked on the referrer)
- **Offline mode** — download quizzes and take them without internet
- **Push notifications** (FCM web push; admins broadcast to everyone)
- Dark / light theme toggle (persisted)
- Free sign-up with email/password + email verification
- **Paid plan**: Teacher Full K200 (quizzes, leaderboard and notes are free)
- **Admin dashboard**: papers/quizzes CRUD, plan claim links, bulk
  broadcast, CSV/JSON quiz import, page-view analytics, promote users
- PWA: installable + works offline after first visit
- Public profiles: avatar (base64 in DB — no Storage needed), bio, points,
  follow system

## Plans

| Plan | Price | Unlocks |
| ---- | ----- | ------- |
| Free | K0 | Papers, search, bookmarks, ratings, quizzes, leaderboard, notes |
| Teacher Full | K200 | Everything: marking schemes, future features, priority support |

Users pay MTN/Airtel mobile money to **+260 97 587 6361** and send the
transaction ID; admins activate the plan from the Payments page. Admins can
also generate claim links under **Admin → Plans**; users open the link and
claim the plan instantly.

## Requirements

- Node.js 18+
- A Firebase project with:
  - Email/password **Authentication** enabled (plus FCM for push)
  - **Realtime Database** created

## Setup (one time)

```bash
npm install
```

Copy `.env.example` to `.env` and put your Firebase web config values in it
(the file is pre-filled with the `chikondi-dot` project values). Push
notifications also need `VITE_FIREBASE_VAPID_KEY`.

### 1. Enable Firebase services

1. Firebase console → your project → **Authentication** → Sign-in method →
   enable **Email/Password**.
2. **Realtime Database** → Create database (production mode) → note the URL.
3. For push: Project settings → **Cloud Messaging** → Web Push certificates →
   copy the key pair, and upload `public/firebase-messaging-sw.js` handling.

> Avatars need no Storage bucket: they are resized in the browser and saved
> as base64 data URLs inside `profiles/<uid>` — works on the free (Spark)
> plan.

### 2. Deploy database rules (security)

```bash
firebase login
firebase deploy --only database
```

Rules: papers/quizzes public-read, admin-write; users manage their own data;
leaderboard public-read, self-write; payments keyed per user
(`payments/<uid>/...`); referrals keyed per referrer; referral codes
public-read; challenges allow auto-join via player uid.

### 3. Seed the database

Admin SDK script (recommended, works for any project):

1. Firebase console → Project settings → **Service accounts** →
   **Generate new private key** → save as `serviceAccountKey.json` in the
   project root (**never commit this file**).
2. Run:

```bash
npm run seed
```

This seeds papers and the 19 built quizzes. Quiz data was rebuilt with
`scripts/rebuild-quizzes.mjs` / `scripts/expand-short-quizzes.mjs` from the
John Web source materials — do not invent exam questions.

### 4. Create your admin account

1. Open the app (`npm run dev`), go to **Sign up** and create an account.
2. Make it admin:

```bash
npm run seed -- --admin youremail@example.com
```

or set `users/<uid>/role` to `"admin"` in the database console.

## Development

```bash
npm run dev
```

Runs at http://localhost:5173

## Build & deploy

Deploy target is configured in `.firebaserc` (default `chikondi-dot`).

```bash
npm run deploy              # build + deploy hosting & rules
```

Or step by step:

```bash
npm run build               # typecheck + production build
npm run deploy:hosting      # push dist/ to Firebase Hosting
npm run deploy:rules        # push database rules
```

## API server (Express + Firebase Admin)

Optional backend at `server/` (deploy to Render):

- `GET /api/health`, `GET /api/stats`, `GET /api/quizzes`
- `GET /api/payments`, `POST /api/payments/confirm` (admin, `x-api-key`)
- `POST /api/broadcast` — bell notifications + FCM pushes to all users

Run locally: `npm run api` (listens on port 3000).

Render setup: root directory `server`, start command `npm start`, env vars
`ADMIN_API_KEY` (choose a secret) and `SERVICE_ACCOUNT_JSON` (paste the
service-account JSON). Without env, the server falls back to
`serviceAccountKey.json` next to it or in the parent directory.

## Broadcast & push scripts

```bash
node scripts/send-push.mjs <serviceAccountKey.json> --subject "Title" --body "Message" [--type custom]
```

Sends a bell notification to every user and a web push to every device that
enabled push (tokens live in `pushTokens/<uid>`).

## Project structure

```
database/            seed JSON (papers, quizzes) + rules
scripts/             seed-db, send-push, rebuild-quizzes, expand-short-quizzes
server/              Express + Firebase Admin API (Render-ready)
src/
  components/        Navbar, Sidebar, PaperCard, QuizCard, ReadAloudButton,
                     PlansOverview, Avatar, FollowButton, dialogs, toasts
  pages/             Home, PapersList, PaperView, Quizzes, QuizTake,
                     Leaderboard, Dashboard, Login, Signup, Claim,
                     AdminDashboard, Profile, EditProfile, Notes, Groups,
                     Challenges, Referrals, ProgressReport, Payments,
                     JohnWeb
  context/           AuthContext (auth, admin role, plan, push registration)
  hooks/             useLocalStorage, useTheme, usePapers, useQuizzes,
                     useTextToSpeech, usePageAnalytics
  data/              RTDB read layer
  utils/             filters, plans, push, offline quiz helpers
  firebase.ts        app/auth/db init (env or chikondi-dot defaults)
```

## Database endpoints (RTDB nodes)

| Node | Read | Write |
| ---- | ---- | ----- |
| `papers`, `quizzes` | public | admin only |
| `users/<uid>` | self / admin | self / admin |
| `profiles/<uid>` | public | self only |
| `results/<uid>` | self / admin | self only |
| `leaderboard/<uid>` | public | self only |
| `following/<uid>` | authenticated | self only |
| `followers/<uid>/<follower>` | public | the follower only |
| `claimCodes/<token>` | admin only | admin or claimer |
| `payments/<uid>/<pid>` | self / admin | admin |
| `referralCodes/<code>` | public | code owner |
| `referrals/<referrer>/<child>` | self | referrer |
| `pushTokens/<uid>` | admin | self |
| `analytics/pages/<path>/views` | admin | anyone (increment) |

## Notes

- PDFs are real ECZ Grade 7 past papers hosted on Google Drive via the
  zambianecz.org archive. Marking schemes are not publicly available, so the
  marking-scheme link is hidden on those papers.
- `serviceAccountKey.json` grants full database access — never commit it.
