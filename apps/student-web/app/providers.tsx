"use client";
import * as React from 'react';
import { ConvexProvider, createConvexClient, getConvexUrl } from '@snaproll/convex-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = React.useRef<ReturnType<typeof createConvexClient> | null>(null);
  if (!clientRef.current) {
    // This file is client-only; safe to read env and construct now
    clientRef.current = createConvexClient(getConvexUrl());
  }
  return <ConvexProvider client={clientRef.current}>{children}</ConvexProvider>;
}


