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
    const { ConvexProvider } = require('convex/react');
    return <ConvexProvider client={clientRef.current as any}>{children}</ConvexProvider> as any;
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={clientRef.current} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}


