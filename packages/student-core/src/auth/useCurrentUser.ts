import { useQuery } from 'convex/react';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';

export type CurrentUser = {
  _id: Id<'users'>;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'STUDENT' | 'TEACHER';
} | null | undefined;

export function useCurrentUser(): CurrentUser {
  return useQuery(api.functions.auth.getCurrentUser);
}


