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

### Technical Architecture

- **Real-time sync**: Convex backend provides instant updates across all clients. It pushes updated data to the application in real time via websockets instead of endless polling. Convex abstracts away the need to ever think about state. Highly recommended!
- **Type-safe API**: End-to-end TypeScript with generated types from database schema
- **Monorepo structure**: Turborepo-powered workspace with shared packages for UI, utilities, and client libraries
- **Auth**: Clerk-based authentication with separate instances for instructors and students
- **Rate limiting**: Built-in protection against abuse with configurable limits and blocking

## Technology Stack

- **Frontend**: Next.js 14, React 19, React Native, Expo
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Clerk (for now; a switch to WorkOS is on the roadmap)
- **Styling**: Tailwind CSS with shared design system
- **Type Safety**: TypeScript throughout
- **Build System**: Turborepo, pnpm workspaces
- **Deployment**: Vercel (web apps), Expo (mobile)

## An overview on how it all works

### Monorepo Organization

The codebase is organized as a Turborepo monorepo with clear separation of concerns:

- `apps/teacher-web`: Desktop-optimized instructor interface
- `apps/student-web`: Mobile-first PWA for students
- `apps/student-mobile`: Native iOS and Android applications
- `packages/ui`: Shared web UI components (Radix UI + shadcn-style)
- `packages/ui-native`: Shared React Native components
- `packages/student-core`: Shared business logic for student-facing apps
- `packages/convex-client`: Type-safe Convex API client with helper functions
- `packages/config`: Shared configuration (Tailwind preset, environment variables)
- `packages/lib`: Shared utilities and helpers
- `convex/`: Backend schema, functions, and authentication configuration

### Real-Time Data Flow

All interactive features leverage Convex's real-time subscriptions, ensuring that:
- Attendance codes appear instantly to students
- Poll results update live as votes are cast
- Slideshow navigation synchronizes across all student devices
- Word cloud responses appear in real-time

### Security and Performance

- Rate limiting on attendance check-ins prevents brute force attempts
- Role-based access control enforced at the database level
- Optimized database indexes for efficient queries
- Service worker caching for offline PWA functionality
- Automatic code expiration for attendance sessions

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
3. Set up environment variables (copy `.env.example` to `.env` and configure from there)
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