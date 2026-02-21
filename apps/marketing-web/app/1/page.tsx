import { DM_Sans, Playfair_Display } from 'next/font/google';

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-proposal-one-display',
  weight: ['600', '700', '800'],
});

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-proposal-one-body',
  weight: ['400', '500', '700'],
});

export default function ProposalOnePage() {
  return (
    <div className={`${display.variable} ${body.variable} relative left-1/2 w-screen -translate-x-1/2 -mt-6 sm:-mt-10`}>
      <section className="relative overflow-hidden bg-[#f9f7f1] text-[#1a2436]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(60% 90% at 10% 12%, rgba(255,135,91,0.25), transparent), radial-gradient(55% 60% at 92% 24%, rgba(27,187,180,0.26), transparent), linear-gradient(180deg, #f9f7f1 0%, #f2f7ff 68%, #eefaf5 100%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10 sm:pb-20 lg:px-14 lg:pb-24">
          <nav className="flex items-center justify-between">
            <a href="/" className="text-2xl tracking-tight [font-family:var(--font-proposal-one-display)]">
              FlameLink
            </a>
            <a
              href="https://instructor.flamelink.app"
              className="rounded-full border border-[#1a2436] px-5 py-2 text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5"
            >
              Instructor Login
            </a>
          </nav>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p
                className="inline-flex rounded-full border border-[#20304a]/20 bg-white/70 px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#29456e]"
                style={{ animation: 'flamelink-fade-up 0.7s ease-out both' }}
              >
                Proposal 1 · Aurora Editorial
              </p>
              <h1
                className="mt-5 text-4xl leading-tight text-[#1a2436] sm:text-5xl lg:text-6xl [font-family:var(--font-proposal-one-display)]"
                style={{ animation: 'flamelink-fade-up 0.8s ease-out 0.08s both' }}
              >
                Bring energy to every seat,
                <span className="block text-[#10496e]">without making class feel chaotic.</span>
              </h1>
              <p
                className="mt-5 max-w-xl text-base leading-7 text-[#31415e] sm:text-lg"
                style={{ animation: 'flamelink-fade-up 0.8s ease-out 0.18s both' }}
              >
                FlameLink gives instructors a clean command center for attendance and live engagement, with a visual language that feels
                modern, credible, and unmistakably premium.
              </p>
              <div className="mt-8 flex flex-wrap gap-3" style={{ animation: 'flamelink-fade-up 0.8s ease-out 0.25s both' }}>
                <a
                  href="https://instructor.flamelink.app"
                  className="rounded-full bg-[#1a2436] px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Instructor Login
                </a>
              </div>
            </div>

            <div className="relative" style={{ animation: 'flamelink-fade-up 0.9s ease-out 0.16s both' }}>
              <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#23b7a5]/30 blur-2xl" />
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#ff8f66]/35 blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-[#1f3556]/15 bg-white/85 p-6 shadow-[0_30px_60px_rgba(20,44,77,0.18)] backdrop-blur">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#edf4ff] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#4b648a]">Attendance</p>
                    <p className="mt-2 text-2xl font-bold text-[#14345a]">96%</p>
                  </div>
                  <div className="rounded-2xl bg-[#eafaf6] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#4e6f66]">Active poll</p>
                    <p className="mt-2 text-2xl font-bold text-[#1d5648]">42</p>
                  </div>
                  <div className="rounded-2xl bg-[#fff2eb] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7e6257]">Cost delta</p>
                    <p className="mt-2 text-2xl font-bold text-[#874023]">-50%</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#23395b]/15 bg-white p-4">
                  <p className="text-sm font-semibold text-[#1a2436]">Live response pulse</p>
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {[36, 52, 41, 67, 58, 49, 72].map((value, idx) => (
                      <div
                        key={value}
                        className="rounded-xl bg-[#ecf2ff] px-2 py-3 text-center"
                        style={{ animation: `flamelink-float ${4 + idx * 0.3}s ease-in-out infinite` }}
                      >
                        <p className="text-xs font-semibold text-[#355583]">{value}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="absolute -left-10 top-16 rounded-xl border border-[#183a5f]/15 bg-white/85 px-3 py-2 text-xs font-semibold text-[#21456e] shadow-lg"
                style={{ animation: 'flamelink-float 6.5s ease-in-out infinite' }}
              >
                Poll launched in 1 click
              </div>
              <div
                className="absolute -bottom-5 right-6 rounded-xl border border-[#0f5449]/20 bg-[#eafaf6] px-3 py-2 text-xs font-semibold text-[#0f5449]"
                style={{ animation: 'flamelink-float 5.7s ease-in-out infinite' }}
              >
                Word cloud fills in real time
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
