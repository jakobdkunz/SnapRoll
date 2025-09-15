import Link from 'next/link';
import { Button, Card } from '@flamelink/ui';

export default function LandingPage() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border bg-white p-6 sm:p-10 shadow-soft">
        <div className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_18s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.20), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.20), transparent)' }} />
        <style jsx>{`
          @keyframes gradient_drift {
            0% { transform: translate3d(0,0,0); }
            50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
            100% { transform: translate3d(0,0,0); }
          }
        `}</style>
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Fast, friendly attendance check‑in</h1>
            <p className="mt-3 text-slate-600 text-base sm:text-lg">FlameLink makes it delightful to check in, interact, and stay present in class. Simple for students, powerful for instructors.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link href="/sign-in"><Button className="min-w-28">Log in</Button></Link>
              <a href="#features" className="text-blue-600 hover:underline font-medium">Learn more →</a>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-5">
          <div className="text-lg font-semibold">One‑tap check‑ins</div>
          <div className="mt-1 text-slate-600 text-sm">Enter a short code to mark attendance. Accessible and fast on any device.</div>
        </Card>
        <Card className="p-5">
          <div className="text-lg font-semibold">Live activities</div>
          <div className="mt-1 text-slate-600 text-sm">Word clouds, polls, and slides keep you engaged with class content.</div>
        </Card>
        <Card className="p-5">
          <div className="text-lg font-semibold">Privacy‑minded</div>
          <div className="mt-1 text-slate-600 text-sm">Built with minimal data collection and modern, secure authentication.</div>
        </Card>
      </div>
    </div>
  );
}
