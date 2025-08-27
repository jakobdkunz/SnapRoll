# Convex Backend for SnapRoll

This directory contains the Convex backend for SnapRoll, replacing the previous Prisma + Next.js API setup.

## Structure

- `schema.ts` - Database schema definition
- `functions/` - API functions (queries and mutations)
  - `users.ts` - User management
  - `sections.ts` - Section management  
  - `attendance.ts` - Attendance tracking
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
import { convex, api } from "@snaproll/convex-client";
import { useQuery, useMutation } from "convex/react";

// In your component
const users = useQuery(api.users.list);
const createUser = useMutation(api.users.create);
```

## Migration from Prisma

This Convex setup mirrors your existing Prisma schema with these key differences:

1. **Real-time subscriptions** instead of polling
2. **Automatic caching** for better performance
3. **Type-safe queries** with automatic joins
4. **Built-in optimistic updates**

## Next Steps

1. ✅ Schema setup
2. ✅ Basic CRUD functions
3. 🔄 Migrate frontend to use Convex client
4. 🔄 Implement real-time features
5. 🔄 Remove old API routes
