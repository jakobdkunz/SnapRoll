"use client";
import { ConvexProvider, convex } from '@snaproll/convex-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}


