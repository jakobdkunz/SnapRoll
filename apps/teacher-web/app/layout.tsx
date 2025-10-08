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
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var uaMobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              var deviceDefault = uaMobile ? 'device' : 'light';
              var pref = localStorage.getItem('theme') || deviceDefault;
              var isDark = pref === 'dark' || (pref === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              var root = document.documentElement;
              if (isDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; } else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body>
        <Providers>
          <div className="min-h-dvh bg-transparent dark:bg-transparent">
          <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <WordmarkLink />
              <TeacherHeaderRight />
            </div>
          </header>
          <AuthGuard />
          <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">{children}</main>
        </div>
        </Providers>
        <script src="/theme.js" />
      </body>
    </html>
  );
}
