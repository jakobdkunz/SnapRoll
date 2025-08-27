import type { Metadata } from 'next';
import './globals.css';
import { AuthGuard } from './_components/AuthGuard';
import { StudentHeaderRight } from './_components/StudentHeaderRight';
import { WordmarkLink } from './_components/WordmarkLink';
import { ConvexProvider, convex } from '@snaproll/convex-client';

export const metadata: Metadata = {
  title: 'SnapRoll – Student',
  description: 'Fast, friendly attendance check-in',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexProvider client={convex}>
          <div className="min-h-dvh bg-slate-50">
            <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                <WordmarkLink />
                <StudentHeaderRight />
              </div>
            </header>
            <AuthGuard />
            <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">{children}</main>
          </div>
        </ConvexProvider>
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }` }} />
      </body>
    </html>
  );
}
