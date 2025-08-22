import type { Metadata } from 'next';
import './globals.css';
import { TeacherHeaderRight } from './_components/TeacherHeaderRight';
import { WordmarkLink } from './_components/WordmarkLink';
import { AuthGuard } from './_components/AuthGuard';

export const metadata: Metadata = {
  title: 'SnapRoll – Instructor',
  description: 'Attendance made delightful',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-dvh">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <WordmarkLink />
              <TeacherHeaderRight />
            </div>
          </header>
          <AuthGuard />
          <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
