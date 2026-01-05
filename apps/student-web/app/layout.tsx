import type { Metadata } from 'next';
import './globals.css';
import { Orbitron } from 'next/font/google';
import { AuthGuard } from './_components/AuthGuard';
import { StudentHeaderRight } from './_components/StudentHeaderRight';
import { WordmarkLink } from './_components/WordmarkLink';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FlameLink – Student',
  description: 'Fast, friendly attendance check-in',
  manifest: '/manifest.json',
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
    <html lang="en" className={orbitron.variable} suppressHydrationWarning>
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
            <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                <WordmarkLink />
                <StudentHeaderRight />
              </div>
            </header>
            <AuthGuard />
            <main className="relative z-0 mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">{children}</main>
          </div>
        </Providers>
        <script src="/theme.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
                  if (!('serviceWorker' in navigator)) return;
                  if (isLocal) {
                    // In local dev, never let a service worker cache stale Next bundles across restarts/env swaps.
                    var already = false;
                    try { already = sessionStorage.getItem('__flamelink_sw_purged__') === '1'; } catch(e) {}
                    var purgeAndReload = function() {
                      try { sessionStorage.setItem('__flamelink_sw_purged__','1'); } catch(e) {}
                      try { location.reload(); } catch(e) {}
                    };
                    navigator.serviceWorker.getRegistrations().then(function(rs){
                      rs.forEach(function(r){ try { r.unregister(); } catch(e){} });
                      if (window.caches && caches.keys) {
                        caches.keys().then(function(keys){
                          keys.forEach(function(k){ try { caches.delete(k); } catch(e){} });
                          if (!already) purgeAndReload();
                        }).catch(function(){ if (!already) purgeAndReload(); });
                      } else {
                        if (!already) purgeAndReload();
                      }
                    }).catch(function(){ /* ignore */ });
                    return; // do not register in localhost
                  }
                  window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js'); });
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
