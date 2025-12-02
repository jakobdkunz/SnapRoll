/**
 * Safe wrappers for Clerk hooks that work in demo mode without ClerkProvider
 */

const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

export function useSafeAuth() {
  if (isDemoMode) {
    return { isLoaded: true, isSignedIn: true, userId: null };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuth: clerkUseAuth } = require('@clerk/nextjs');
    return clerkUseAuth();
  } catch {
    return { isLoaded: true, isSignedIn: false, userId: null };
  }
}

