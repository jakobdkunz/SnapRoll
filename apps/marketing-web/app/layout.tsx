import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlameLink',
  description: 'Attendance made delightful',
};

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var pref = localStorage.getItem('marketing-theme-preference');
                  if (pref !== 'light' && pref !== 'dark' && pref !== 'system') {
                    var legacy = localStorage.getItem('theme');
                    if (legacy === 'light' || legacy === 'dark') pref = legacy;
                    else if (legacy === 'device') pref = 'system';
                    else pref = 'system';
                  }
                  var isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
