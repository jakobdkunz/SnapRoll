import Link from 'next/link';
import Image from 'next/image';
import { Button, Card } from '@flamelink/ui';

export default function LandingPage() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border bg-white p-6 sm:p-10 shadow-soft">
        <div className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_18s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.20), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.20), transparent)' }} />

        <div className="relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Attendance made delightful</h1>
            <p className="mt-3 text-slate-600 text-base sm:text-lg">Streamline roll‑taking, spark engagement, and see class insights at a glance. Designed for instructors, loved by students.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link href="/sign-in"><Button className="min-w-28">Log in</Button></Link>
              <a href="#features" className="text-blue-600 hover:underline font-medium">Explore features →</a>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-5">
          <div className="text-lg font-semibold">Instant rosters</div>
          <div className="mt-1 text-slate-600 text-sm">Import CSVs or add students quickly, complete with join codes.</div>
        </Card>
        <Card className="p-5">
          <div className="text-lg font-semibold">Engagement tools</div>
          <div className="mt-1 text-slate-600 text-sm">Run polls, word clouds, and slides in seconds—no extra setup.</div>
        </Card>
        <Card className="p-5">
          <div className="text-lg font-semibold">Actionable insights</div>
          <div className="mt-1 text-slate-600 text-sm">See trends over time and spot who needs help at a glance.</div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="text-center text-slate-600 text-sm mb-3">Product previews</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-center">
          <Card className="p-3 overflow-hidden">
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-slate-100">
              <Image src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE7xxh4oXSTpQFUsHlVAhxM8u6DNnPiKqLzZc0" alt="MacBook mockup" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
          </Card>
          <Card className="p-3 overflow-hidden">
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-slate-100">
              <Image src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepEcWE56ZJ1MDQrUL0pz8OZEKtHdsAjTXP6uBVJ" alt="iPhone mockup" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
          </Card>
          <Card className="p-3 overflow-hidden">
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-slate-100">
              <Image src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE9pzLoI3Fz9VoWxJBkvIUwGrZKR4i6uQYEgMn" alt="iPad mockup" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
