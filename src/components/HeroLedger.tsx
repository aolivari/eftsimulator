import React, { useEffect, useState } from 'react';

interface HeroLedgerProps {
  finalBalance: number;
  totalInvested: number;
  brokerName: string;
  years: number;
  annualReturn: number;
}

const eur = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = value;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export default function HeroLedger({
  finalBalance,
  totalInvested,
  brokerName,
  years,
  annualReturn,
}: HeroLedgerProps) {
  const shown = useCountUp(finalBalance);
  const gains = Math.max(finalBalance - totalInvested, 0);
  const investedShare = finalBalance > 0 ? Math.min(totalInvested / finalBalance, 1) : 1;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-10 lg:p-14"
    >
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />

      <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="space-y-5">
          <h1 id="hero-title" className="text-base sm:text-lg font-bold text-white/80">
            ETF Simulator <span className="text-orange-400">&amp;</span> Plan de Ahorro
          </h1>
          <p className="text-[clamp(3.5rem,9vw,8.5rem)] font-black leading-[0.9] tracking-tighter tabular-nums">
            {eur.format(shown)}
            <span className="text-orange-400"> €</span>
          </p>
          <p className="text-base sm:text-lg text-white/75 max-w-xl">
            Capital final tras {years} años con una rentabilidad media del {annualReturn}% anual, en{' '}
            <span className="font-semibold text-white">{brokerName}</span>.
          </p>
        </div>

        <div className="space-y-4">
          <div
            role="img"
            aria-label={`Aportado ${eur.format(totalInvested)} euros y plusvalía ${eur.format(gains)} euros`}
            className="flex h-4 w-full overflow-hidden rounded-full bg-white/10"
          >
            <div className="h-full bg-white/60 transition-[width] duration-700" style={{ width: `${investedShare * 100}%` }} />
            <div className="h-full flex-1 bg-orange-500" />
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-white/60">Aportado</dt>
              <dd className="text-xl font-bold tabular-nums">{eur.format(totalInvested)} €</dd>
            </div>
            <div>
              <dt className="text-white/60">Plusvalía</dt>
              <dd className="text-xl font-bold tabular-nums text-orange-400">+{eur.format(gains)} €</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
