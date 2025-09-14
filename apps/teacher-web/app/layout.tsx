import type { Metadata } from 'next';
import './globals.css';
import { Orbitron } from 'next/font/google';
import { TeacherHeaderRight } from './_components/TeacherHeaderRight';
import { WordmarkLink } from './_components/WordmarkLink';
import { AuthGuard } from './_components/AuthGuard';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FlameLink – Instructor',
  description: 'Attendance made delightful',
};

export const dynamic = 'force-dynamic';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <head>
      </head>
      <body>
        <Providers>
          <div className="min-h-dvh bg-slate-50">
          <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <WordmarkLink />
              <TeacherHeaderRight />
            </div>
          </header>
          <AuthGuard />
          <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">{children}</main>
        </div>
        </Providers>
      </body>
    </html>
  );
}
