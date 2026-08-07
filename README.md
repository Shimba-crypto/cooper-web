# CooperWeb — ECZ Grade 7 Past Papers

A Vite + React + TypeScript platform for Zambian ECZ Grade 7 past papers,
timed quizzes, mock exams, leaderboard and admin management. Data lives in
Firebase Realtime Database — no dummy data.

## Features

- Past papers grid with search + filters (subject, year, paper type)
- Paper detail page: PDF link, 5-star rating, social share
- Quizzes with multiple-choice questions, instant results with explanations
- Global leaderboard (scores saved per user)
- Bookmarks, ratings and study dashboard (localStorage)
- Dark / light theme toggle (persisted)
- Free sign-up with email/password
- **Paid plans** (claimed via admin-generated links): Student Plus K50,
  Teacher Plus K100, Teacher Full K200
- Admin dashboard: add/edit/delete papers & quizzes, generate plan claim
  links, promote users to admin
- PWA: installable + works offline after first visit
- Public user profiles: avatar upload (resized and stored in the database),
  bio, member-since, quiz points, follower/following counts, follow system

## Plans

| Plan | Price | Unlocks |
| ---- | ----- | ------- |
| Free | K0 | Papers, search, bookmarks, ratings |
| Student Plus | K50 | Timed quizzes, leaderboard |
| Teacher Plus | K100 | Marking schemes |
| Teacher Full | K200 | Everything, including future features |

Admins generate claim links under **Admin → Plans** (choose plan, number of
uses per link, quantity). Users open the link (e.g.
`https://chikondi-dot.web.app/claim/cw-abc…`), log in and claim the plan instantly.
Users without a link see an upgrade prompt with a claim-code field on every
locked feature.

## Requirements

- Node.js 18+
- A Firebase project with:
  - Email/password **Authentication** enabled
  - **Realtime Database** created

## Setup (one time)

```bash
npm install
```

Copy `.env.example` to `.env` and put your Firebase web config values in it
(the file is pre-filled with the `chikondi-dot` project values).

### 1. Enable Firebase services

1. Firebase console → your project → **Authentication** → Sign-in method →
   enable **Email/Password**.
2. **Realtime Database** → Create database (production mode) → note the URL
   (e.g. `https://chikondi-dot-default-rtdb.firebaseio.com`).

> Profile pictures need no Storage bucket: avatars are resized to 256px in
> the browser and saved as base64 data URLs inside `profiles/<uid>` — works
> on the free (Spark) plan.

### 2. Deploy database rules (security)

```bash
firebase login
firebase deploy --only database
```

Rules: papers/quizzes readable by everyone, written only by admins; users
manage their own data; leaderboard is public-read, self-write; profiles are
public-read, self-write (avatar included); following is private-read,
self-write; followers is public-read and anyone can add/remove their own
entry.

### 3. Seed the database

Option A — Admin SDK script (recommended, works for any project):

1. Firebase console → Project settings → **Service accounts** →
   **Generate new private key** → save as `serviceAccountKey.json` in the
   project root (do not commit this file!).
2. Run:

```bash
npm run seed
```

Option B — Manual import: Firebase console → Realtime Database → import
`database/papers.json` and `database/quizzes.json`.

### 4. Create your admin account

1. Open the app (`npm run dev`), go to **Sign up** and create an account.
2. Make it admin with the seed script:

```bash
npm run seed -- --admin youremail@example.com
```

   or manually set `users/<uid>/role` to `"admin"` in the database console.

Once admin, you can also add papers/quizzes from the **Admin** dashboard in
the app — no script needed.

## Development

```bash
npm run dev
```

Runs at http://localhost:5173

## Build & deploy

Deploy target is configured in `.firebaserc` (default `chikondi-dot` →
`chikondi-dot.web.app`). To switch to another project:

```bash
firebase use <project-id>   # e.g. firebase use chikondi-dot
```

Then:

```bash
npm run deploy              # build + deploy hosting & rules
```

Or step by step:

```bash
npm run build               # typecheck + production build
npm run deploy:hosting      # push dist/ to Firebase Hosting
npm run deploy:rules        # push database rules
```

After deploy you'll get `https://<project-id>.web.app` (e.g.
`https://chikondi-dot.web.app`).

## Project structure

```
database/            seed JSON (papers, quizzes) + rules
scripts/seed-db.mjs  Admin SDK seed script (papers, quizzes, --admin <email>)
src/
  components/        Navbar, Sidebar, PaperCard, FilterBar, SocialShare,
                     StarRating, SuggestedPapers, QuizCard,
                     Spinner, Avatar, AvatarUploader, FollowButton
  pages/             Home, PapersList, PaperView, Quizzes, QuizTake,
                     Leaderboard, Dashboard, Login, Signup, Claim,
                     AdminDashboard, Profile, EditProfile
  context/           AuthContext (login/signup/logout, admin role, plan)
  hooks/             useLocalStorage, useTheme, usePapers, useQuizzes
  data/              RTDB read layer (papers, quizzes, profiles)
  utils/             filters, rating helpers, plans
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

## Notes

- PDFs are real ECZ Grade 7 past papers (2010–2021) hosted on Google Drive
  via the zambianecz.org archive. Marking schemes are not publicly available,
  so the marking-scheme link is hidden on those papers.
- `serviceAccountKey.json` grants full database access — never commit it.
