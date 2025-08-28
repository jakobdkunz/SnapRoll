"use client";
import * as React from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { createConvexClient, getConvexUrl } from '@snaproll/convex-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const url = getConvexUrl();
  if (!url) return <>{children}</>;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  if (!clientRef.current) clientRef.current = createConvexClient(url);
  if (!publishableKey) {
    // Build-safe fallback: still provide Convex context without Clerk
    return (
      <>{/* no Clerk */}
        <ConvexProviderWithClerk client={clientRef.current as any} useAuth={() => ({ isSignedIn: false } as any)}>
          {children}
        </ConvexProviderWithClerk>
      </>
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}


