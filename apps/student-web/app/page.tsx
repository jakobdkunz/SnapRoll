import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@snaproll/convex-client/server';

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return url;
}

export default async function StudentRoot() {
  const { userId, getToken } = await auth();
  if (!userId) redirect('/sign-in');
  try {
    const token = await getToken({ template: 'convex' });
    if (token) {
      const convex = new ConvexHttpClient(getConvexUrl());
      convex.setAuth(token);
      await convex.mutation(api.functions.auth.upsertCurrentUser, { role: 'STUDENT' });
    }
  } catch (e) {
    // best-effort upsert; ignore errors
  }
  redirect('/sections');
}
