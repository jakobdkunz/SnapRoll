import type { Metadata } from 'next';
import './globals.css';
import { InstallPrompt } from './install-prompt';
import { StudentHeaderRight } from './_components/StudentHeaderRight';
import { WordmarkLink } from './_components/WordmarkLink';

export const metadata: Metadata = {
  title: 'SnapRoll – Student',
  description: 'Fast, friendly attendance check-in',
  manifest: '/manifest.json',
  themeColor: '#7C9AFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <InstallPrompt />
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
            <WordmarkLink />
            <StudentHeaderRight />
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }` }} />
      </body>
    </html>
  );
}
