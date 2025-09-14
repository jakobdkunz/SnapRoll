# Convex Backend for FlameLink

This directory contains the Convex backend for FlameLink, providing real-time database and API functionality.

## Structure

- `schema.ts` - Database schema definition
- `functions/` - API functions (queries and mutations)
  - `users.ts` - User management
  - `sections.ts` - Section management  
  - `attendance.ts` - Attendance tracking
  - `enrollments.ts` - Student enrollment
  - `history.ts` - Historical data queries
  - `polls.ts` - Poll functionality
  - `wordcloud.ts` - Word cloud sessions
  - `slideshow.ts` - Slideshow management
  - `seed.ts` - Demo data seeding
  - `demo.ts` - Simple test function

## Development

```bash
# Start development server
npx convex dev

# Deploy to production
npx convex deploy
```

## Environment Variables

The following environment variables are automatically set by Convex:
- `CONVEX_DEPLOYMENT` - Development deployment name
- `CONVEX_URL` - Production deployment URL

## Frontend Integration

To use Convex in your frontend apps, add the environment variable:
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Then use the Convex client:
```typescript
import { convex, api } from "@flamelink/convex-client";
import { useQuery, useMutation } from "convex/react";

// In your component
const users = useQuery(api.users.list);
const createUser = useMutation(api.users.create);
```

## Features

1. **Real-time subscriptions** for live updates
2. **Automatic caching** for better performance
3. **Type-safe queries** with automatic joins
4. **Built-in optimistic updates**
5. **Complete CRUD operations** for all entities
6. **Interactive features** (polls, word clouds, slideshows)

## Current Status

✅ Schema setup  
✅ All CRUD functions  
✅ Real-time features  
✅ Frontend integration  
✅ Demo data seeding
