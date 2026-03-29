# SETPIECE by PerformIQ

## Overview

Football set-piece execution system. Coaches create set pieces with a tactical editor, assign player roles, share via QR codes, manage matchdays, and track player readiness via quizzes. Players access their role via a mobile-first PWA.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect with PKCE)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Domain Model

- **Teams**: Owned by coaches, contain players and set pieces
- **Players**: Team members with attributes (height, speed, heading strength, tags)
- **Set Piece Templates**: Library of reusable set piece patterns (10 built-in)
- **Set Pieces**: Team-specific instances with status (draft → ready → active_matchday → archived)
- **Roles**: Named positions within a set piece (Delivery, Near Post Flick, etc.)
- **Role Assignments**: Maps roles to players with optional backup player
- **Matchdays**: Group set pieces for a specific match
- **Share Links**: Scoped, tokenized access (playerScope, matchdayScope, allowedSetPieceIds, expiry, revocation)
- **Player Readiness**: Tracks view count, opened/ready/quiz status per player per set piece
- **Quiz Attempts**: Auto-generated quizzes based on role data (tap_zone, multiple_choice, yes_no)
- **Ghost Mode**: Preview substitution impact with suitability hints and warnings
- **Audit Events**: Full trail of all actions
- **Pricing**: Free, Solo Coach (8 CHF/mo), Team (19 CHF/mo)

## Database Schema

13 tables in `lib/db/src/schema/`:
- `auth.ts` — users, sessions (Replit Auth)
- `teams.ts` — teams
- `memberships.ts` — user-team memberships with roles
- `players.ts` — team players with attributes
- `setPieceTemplates.ts` — template library (auto-seeded on startup via `seedTemplates.ts`)
- `setPieces.ts` — team set pieces with versioning
- `setPieceRoles.ts` — roles within set pieces
- `roleAssignments.ts` — role-to-player mapping
- `playerReadiness.ts` — readiness tracking
- `quizAttempts.ts` — quiz submissions
- `shareLinks.ts` — scoped share tokens
- `matchdays.ts` — matchdays + matchday_set_pieces junction
- `auditEvents.ts` — audit trail

## Authorization & Security

- **Role-based access control**: `requireTeamAccess(req, res, roles?)` checks membership; `requireCoachAccess` (head_coach + assistant_coach) and `requireHeadCoachAccess` (head_coach only) enforce write permissions
- **Share-token middleware**: `requireShareToken(req, res)` validates token, checks expiry/revocation, updates `lastAccessedAt`
- **Cross-team integrity**: Assignment writes verify player belongs to team; share-token write paths verify player and set piece belong to link's team
- **Zod validation**: All request bodies and query parameters validated with Zod schemas; errors return 400 with structured details

## API Routes

All mounted at `/api` via Express router. Key routes:

- `GET /api/healthz` — health check
- Auth: `/api/auth/user`, `/api/login`, `/api/callback`, `/api/logout`, `/api/mobile-auth/*`
- Teams: `/api/teams`, `/api/teams/:teamId`
- Players: `/api/teams/:teamId/players`, `/api/teams/:teamId/players/:playerId`
- Templates: `/api/templates` (public, no auth)
- Set Pieces: `/api/teams/:teamId/set-pieces`, status updates, match-pack export
- Roles & Assignments: nested under set pieces
- Matchdays: `/api/teams/:teamId/matchdays`, add/remove set pieces
- Sharing: `/api/teams/:teamId/share-links`, `/api/p/:shareToken` (player view)
- Quiz: `/api/p/:shareToken/quiz` (GET questions, POST answers)
- Readiness: `/api/teams/:teamId/readiness`
- Ghost Mode: `/api/teams/:teamId/set-pieces/:setPieceId/ghost`
- Audit: `/api/teams/:teamId/audit`
- Pricing: `/api/pricing`

## Seed Data

Run `pnpm --filter @workspace/scripts run seed` to populate:
- 1 demo coach, 1 team (FC Demo), 14 players
- 10 set piece templates across all categories
- 5 set pieces with roles and assignments
- 1 matchday with 3 active set pieces
- Player readiness records
- 1 share link

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Root `tsconfig.json` lists all packages as project references.

- Typecheck from root: `pnpm run typecheck`
- Only `.d.ts` emitted during typecheck; JS bundling via esbuild/tsx/vite

## Root Scripts

- `pnpm run build` — typecheck + build all packages
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod schemas and React Query hooks
- `pnpm --filter @workspace/db run push` — push schema to database
- `pnpm --filter @workspace/scripts run seed` — seed demo data

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Replit Auth, structured pino logging.

- Entry: `src/index.ts`
- App: `src/app.ts` — CORS, cookies, auth middleware, routes
- Routes: `src/routes/index.ts` mounts 14 sub-routers
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/setpiece` (`@workspace/setpiece`)

React + Vite frontend (Coach Dashboard + Player PWA).

- Preview path: `/setpiece/`
- Pages: Landing, Onboarding (5-step wizard), Dashboard, TeamDashboard, Players, Templates, SetPieceEditor (save states, PDF export, inline title editing, ghost mode link), Matchdays, MatchdayDetail (QR share with player scope + expiry), Readiness (search + set piece filter), GhostMode, Pricing, Settings, PlayerPWA, PlayerQuiz
- Components: Pitch (SVG tactical board), Layout (CoachLayout with sidebar + mobile drawer), StatusBadge, InstallPrompt
- Uses generated React Query hooks from `@workspace/api-client-react`
- API base URL: empty string (API server is at root `/api/...` path)
- Auth: login redirects to `/api/login`, logout to `/api/logout`
- Player view: `/p/:shareToken` — mobile-first PWA, no auth needed
- PWA: manifest.json, service worker (sw.js), offline-first caching
- Design: Dark navy theme, emerald primary (#10b981), Outfit display font, Inter body font
- Dependencies: framer-motion, lucide-react, qrcode.react, date-fns, wouter, zustand, html2canvas, jspdf

### `lib/db` (`@workspace/db`)

Drizzle ORM + PostgreSQL. 13 schema files.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec with comprehensive endpoints for the SETPIECE system.

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client. `setBaseUrl()` configures the API base path.

### `scripts` (`@workspace/scripts`)

Utility scripts including database seeding.
