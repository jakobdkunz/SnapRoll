# SnapRoll Monorepo

A Turborepo monorepo for SnapRoll with Next.js apps for teachers and students, shared packages, and Convex backend.

## Prerequisites
- PNPM 9+
- Node 18+
- Convex account

## Getting Started
1. Copy env example and set up environment variables
```bash
cp .env.example .env
```
2. Install deps
```bash
pnpm install
```
3. Setup Convex
```bash
pnpm convex:dev
```
4. Run dev servers (all)
```bash
pnpm dev
```

## Apps
- apps/teacher-web: Desktop-only teacher app
- apps/student-web: Mobile-first PWA

## Packages
- packages/ui: Shared UI components (Tailwind + Radix + shadcn-style)
- packages/lib: Utilities and helpers
- packages/convex-client: Typed Convex client
- packages/config: Shared configs (Tailwind preset, env)

## Scripts
- dev, build, start, lint, typecheck
- convex:dev, convex:deploy

## Notes
- Tailwind preset is in `@snaproll/config/tailwind-preset`.
- PWA support is enabled in `apps/student-web` with manifest and service worker.
- Backend is powered by Convex with real-time subscriptions.
