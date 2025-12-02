# SnapRoll (a.k.a. FlameLink)

Attendance tracking and realtime student engagement for higher-ed. Optimized for cost-efficiency: similar software solutions cost universities hundreds of thousands to millions of dollars per year, while SnapRoll costs far less. FERPA-compatible. Deploys on desktop/mobile web, iOS, and Android.

## Overview

SnapRoll solves attendance and student engagement in large lecture halls. Instructors generate a code, and students type it in to prove their attendance. Real-time interactive features like polls, word clouds, and quizzes enable instructors to foster active participation.

The system supports multiple deployment models, from individual instructor use to institution-wide implementations, with role-based access control and comprehensive audit trails.


## Key Features

### Attendance Management

- **Time-limited attendance codes**: Generate secure, expiring codes for class sessions
- **Automated check-in**: Students check in using 4-digit codes with rate limiting to prevent abuse
- **Historical records**: Complete attendance history with date-based queries and filtering
- **Policy-based absence tracking**: Configurable permitted absences per-semester

### Interactive Engagement Tools

- **Real-time polls**: Create multiple-choice polls with live results display
- **Word cloud sessions**: Collect and visualize student responses in real-time
- **Synchronized slideshows**: Present slides with instructor-controlled navigation, optional drawing annotations, and device synchronization
- **Participation credit system**: Track engagement through points-based participation opportunities

### Multi-Platform Support

- **Web applications**: Responsive Next.js applications optimized for desktop (instructor) and mobile-first (student) experiences
- **Native mobile app**: React Native application for iOS and Android using Expo.

### Architecture & Stack

**Stack**: Next.js 14 + React 19 (web), React Native + Expo (mobile), Convex (real-time backend), Clerk (auth), Tailwind CSS, TypeScript throughout. Deployed on Vercel (web) and Expo (mobile).

**Monorepo**: Turborepo + pnpm workspaces with `apps/` (teacher-web, student-web, student-mobile) and `packages/` (shared UI, utilities, Convex client, config).

**Real-time**: Convex pushes updates via websockets—attendance codes, poll results, slideshow navigation, and word clouds all sync instantly across devices.

**Security**: Rate limiting on check-ins, role-based access control at the database level, automatic code expiration, and service worker caching for offline PWA support.

## Roadmap

### Near-Term

- Switch auth to use WorkOS instead of Clerk. WorkOS is easier for instututions to integrate with, and includes first 1,000,000 users free — zero universities are large enough to escape their "free" plan.
- LTI 1.3 integration with LMSs (particularly Canvas)
- Save/load interactive activities for lesson planning

### Medium-Term

- Proper multi-institution support
- Advanced gamification: Leaderboards, achievements, and games for participation credit
- Enhanced screen reader support
- Instructor dashboard that surfaces at-risk students (ones that have not attended class/participated in activities)

### Down the road

- White-labeling: Customizable branding and theming for institutional deployments
- Multi-language support; Spanish translation and more

## Development

### Prerequisites

- Node.js 18 or higher
- pnpm 9 or higher
- Convex account
- Clerk account (for authentication)

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables for each client (copy `.env.example` to `.env` and configure from there)
4. Initialize Convex:
   ```bash
   pnpm convex:dev
   ```
5. Start development servers:
   ```bash
   pnpm dev
   ```
6. And you're off to the races.



---

Copyright (c) 2025 Jakob Kunz. All rights reserved.

This software is provided for review only. No permission is granted to use, copy, modify, compile, distribute, or deploy this software, in whole or in part, for any purpose other than evaluation.

Licensing available upon request.