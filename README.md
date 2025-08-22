# SnapRoll Monorepo

A Turborepo monorepo for SnapRoll with Next.js apps for teachers and students, shared packages, and Prisma + PostgreSQL backend.

## Prerequisites
- PNPM 9+
- Node 18+
- PostgreSQL 14+

## Getting Started
1. Copy env example and set DATABASE_URL
```bash
cp .env.example .env
```
2. Install deps
```bash
pnpm install
```
3. Setup database
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```
4. Run dev servers (all)
```bash
pnpm dev
```

## Apps
- apps/teacher-web: Desktop-only teacher app
- apps/student-web: Mobile-first PWA
- apps/api: API routes (Next.js)

## Packages
- packages/ui: Shared UI components (Tailwind + Radix + shadcn-style)
- packages/lib: Utilities and helpers
- packages/api-client: Typed API client
- packages/config: Shared configs (Tailwind preset, env)

## Scripts
- dev, build, start, lint, typecheck
- prisma:generate, prisma:migrate, prisma:seed

## Notes
- Tailwind preset is in `@snaproll/config/tailwind-preset`.
- PWA support is enabled in `apps/student-web` with manifest and service worker.
