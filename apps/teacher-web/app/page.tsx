import Link from 'next/link';
import Image from 'next/image';
import { Button, Card } from '@flamelink/ui';

export default function LandingPage() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border bg-white p-6 sm:p-10 shadow-soft">
        <div className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_18s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.20), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.20), transparent)' }} />
        <div className="relative z-10">
          <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 items-center gap-6 sm:gap-10">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Attendance made delightful</h1>
              <p className="mt-3 text-slate-600 text-base sm:text-lg">Streamline roll‑taking, spark engagement, and see class insights at a glance. Designed for instructors, loved by students.</p>
              <div className="mt-5 flex items-center justify-center lg:justify-start gap-3">
                <Link href="/sign-in"><Button className="min-w-28">Log in</Button></Link>
                <a href="#features" className="text-blue-600 hover:underline font-medium">Explore features →</a>
              </div>
            </div>
            <div className="relative h-[300px] sm:h-[380px] lg:h-[440px]">
              {/* MacBook */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[82%] aspect-[16/10] drop-shadow-xl">
                <Image
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE7xxh4oXSTpQFUsHlVAhxM8u6DNnPiKqLzZc0"
                  alt="FlameLink on MacBook"
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-contain"
                  priority
                  quality={90}
                />
              </div>
              {/* iPad */}
              <div className="absolute left-[4%] bottom-2 w-[38%] aspect-[4/3] -rotate-2 drop-shadow-md">
                <Image
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE9pzLoI3Fz9VoWxJBkvIUwGrZKR4i6uQYEgMn"
                  alt="FlameLink on iPad"
                  fill
                  sizes="(max-width: 1024px) 45vw, 20vw"
                  className="object-contain"
                  priority
                  quality={90}
                />
              </div>
              {/* iPhone */}
              <div className="absolute right-[2%] bottom-0 w-[24%] aspect-[9/19] rotate-2 drop-shadow-md">
                <Image
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepEcWE56ZJ1MDQrUL0pz8OZEKtHdsAjTXP6uBVJ"
                  alt="FlameLink on iPhone"
                  fill
                  sizes="(max-width: 1024px) 30vw, 14vw"
                  className="object-contain"
                  priority
                  quality={90}
                />
              </div>
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
    </div>
  );
}
