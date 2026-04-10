# SETPIECE by PerformIQ

## Overview

SETPIECE is a football set-piece execution system designed to empower coaches and engage players. It enables coaches to create, manage, and share tactical set pieces, track player readiness, and analyze performance. The system streamlines set-piece management, improves player understanding, and enhances team cohesion, ultimately aiming to provide a competitive advantage on the field. The platform includes a comprehensive tactical editor, player role assignments, matchday management, and player readiness tracking via interactive quizzes. Players access their specific roles and set-piece information through a mobile-first Progressive Web Application (PWA).

## User Preferences

I prefer iterative development, with a focus on delivering core features first and then refining them.
Please use clear and concise language in all explanations and documentation.
When making significant changes, please ask for confirmation before proceeding.
I prefer detailed explanations for complex technical decisions.
Do not make changes to the `lib/db` folder without explicit instruction.
Do not make changes to the `artifacts/setpiece` folder without explicit instruction.

## System Architecture

The project is a pnpm workspace monorepo utilizing TypeScript.

**Technical Stack:**
- **Monorepo Tool:** pnpm workspaces
- **Node.js:** v24
- **Package Manager:** pnpm
- **TypeScript:** v5.9
- **API Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Email/Password (bcrypt) + Google OAuth2, session-based
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild (ESM bundle)
- **Frontend:** React + Vite (Coach Dashboard and Player PWA)

**Project Structure:**
The monorepo is organized into `artifacts` (deployable applications), `lib` (shared libraries), and `scripts` (utility scripts).
- `artifacts/api-server`: The Express API server.
- `artifacts/setpiece`: The React + Vite frontend application, serving both the coach dashboard and the player PWA.
- `lib/api-spec`: Contains the OpenAPI specification for the API.
- `lib/api-client-react`: Generated React Query hooks for API interaction.
- `lib/api-zod`: Generated Zod schemas from the OpenAPI spec.
- `lib/db`: Drizzle ORM schema and database connection.

**Domain Model Highlights:**
- **Teams:** Owned by coaches, contain players and set pieces.
- **Players:** Team members with attributes and assigned roles.
- **Set Pieces:** Team-specific tactical plays with versioning and status (draft, ready, active_matchday, archived).
- **Roles:** Defined positions within a set piece (e.g., Delivery, Near Post Flick).
- **Matchdays:** Groups set pieces for specific matches.
- **Share Links:** Tokenized access for players to view set pieces or matchdays.
- **Player Readiness:** Tracks player engagement with set pieces (view count, quiz status).
- **Quiz Attempts:** Auto-generated quizzes based on role data.
- **Ghost Mode:** Allows previewing substitution impacts.
- **Pricing:** Tiered subscription model (Free, Solo Coach, Team).

**Frontend (Coach Dashboard & Player PWA):**
- **UI/UX:** Premium dark-mode design system with emerald primary accents (#10b981), using Outfit for display and Inter for body text. Design tokens: --radius: 1.125rem (18px), surface layers (--surface-0 through --surface-3), premium spacing scale. UI primitives use rounded-xl/2xl borders, white/[0.06] translucent borders, gradient progress bars, shimmer skeleton animations, and active:scale-[0.98] micro-interactions. Utility classes: section-label, premium-card, premium-glow, sticky-bottom-bar, skeleton-shimmer.
- **Key Pages:** Landing, Onboarding, Dashboard, Team Dashboard, Players, Templates, Set Piece Editor, Matchdays, Readiness, Pricing, Settings, Player PWA, Player Quiz.
- **Set Piece Editor:** A sophisticated tactical editor built with React Konva and Zustand for state management. It supports:
    - Tool selection, annotations (run paths, pass lines, zones), entity markers (players, ball).
    - Step-based animation for set piece progression.
    - Multiple editor modes (basic/advanced), pitch themes.
    - Snap-to-pitch-anchors and snap-to-marker functionality for precise drawing.
    - **Responsive layout (3-tier breakpoints):** Uses `useBreakpoint()` hook from `hooks/use-mobile.tsx` returning `'mobile' | 'tablet' | 'desktop'`. Mobile (<768px): compact header, fullscreen pitch (zero padding), bottom dock (2-row BottomBar), Drawer-based bottom sheet inspector, floating MobileToolDrawer, compact canvas labels (role names hidden, last names truncated). Tablet (768–1023px): full header controls, compact pitch padding, side Sheet inspector, compact toolbar. Desktop (≥1024px): full header, integrated `<aside>` inspector sidebar (`w-80 xl:w-[340px]`), full toolbar and bottom bar. Canvas fills the full viewport; toolbar, inspector, and bottom bar use glassmorphic overlays with `backdrop-blur-xl` and `rounded-2xl`. Inspector collapsible on desktop via `inspectorCollapsed` store flag.
    - **Contextual mini-bar (`ContextualMiniBar`):** Floating top-center bar that appears when an annotation/entity is selected, providing quick actions (color picker, dash toggle, arrowhead, duplicate, delete).
    - **Direct manipulation drag handles:** Per-waypoint `DragHandle` and `RadiusHandle` on canvas for annotations, with live RAF-throttled updates.
    - Validation panel (`BoardHealth`) to check for unassigned roles and missing paths.
    - Presentation Mode for full-screen playback.
    - Tutorial Overlay and Contextual Tips for user guidance.
- **ErrorBoundary:** Wraps critical components (e.g., EditorCanvas) to prevent unhandled React errors from causing a blank/black screen. Shows a friendly error UI with a "Try Again" button.
- **Player PWA:** Mobile-first design accessed via share tokens, no authentication required for viewing. Supports offline caching.
- **Demo Pages:** Read-only demo versions of key features available without authentication under `/demo/*` routes.

**Backend (API Server):**
- **Authorization:** Role-based access control (`requireTeamAccess`, `requireCoachAccess`, `requireHeadCoachAccess`) and share-token middleware (`requireShareToken`).
- **Security:** Zod validation for all request bodies and query parameters, ensuring data integrity and preventing malformed requests.
- **API Routes:** Comprehensive set of RESTful endpoints for authentication, team management, player management, set piece creation and management, matchday organization, sharing, quizzes, billing, and auditing.

## External Dependencies

- **PostgreSQL:** Primary database for all application data.
- **Stripe:** Used for handling subscriptions, payments (Stripe Checkout), and customer portal management. Integrated with `stripe-replit-sync` for webhook processing and data synchronization.
- **Google OAuth2:** For user authentication.
- **Resend:** For sending transactional emails, including email verification.
- **framer-motion:** For animations in the React frontend.
- **lucide-react:** For icons in the React frontend.
- **qrcode.react:** For generating QR codes in the React frontend.
- **date-fns:** For date manipulation in the React frontend.
- **wouter:** For routing in the React frontend.
- **zustand:** For state management in the React frontend.
- **html2canvas & jspdf:** For PDF export functionality in the set piece editor.
- **react-konva & konva:** For building the interactive set piece tactical editor.