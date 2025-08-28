"use client";
import * as React from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { createConvexClient, getConvexUrl } from '@snaproll/convex-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const url = getConvexUrl();
  if (!url) return <>{children}</>;
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  if (!clientRef.current) clientRef.current = createConvexClient(url);
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl="/"
      signUpUrl="/sign-up"
    >
      <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}


