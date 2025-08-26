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
      <head>
        <link rel="stylesheet" href="/vendor/reveal.css" />
        <link rel="stylesheet" href="/vendor/pptxjs.css" />
        <script src="/vendor/jquery.min.js"></script>
        <script src="/vendor/jszip.min.js"></script>
        <script src="/vendor/reveal.js"></script>
        <script src="/vendor/pptxjs.min.js"></script>
        <script src="/vendor/divs2slides.min.js"></script>
      </head>
      <body>
        <div className="min-h-dvh">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <WordmarkLink />
              <TeacherHeaderRight />
            </div>
          </header>
          <AuthGuard />
          <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-6 sm:pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
