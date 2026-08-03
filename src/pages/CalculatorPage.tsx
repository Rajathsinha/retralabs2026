import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator as CalculatorIcon,
  Beaker,
  Syringe,
  Droplets,
  FlaskConical,
  ShieldAlert,
  Info,
  ArrowLeft,
  CheckCircle2,
  Thermometer,
  RotateCcw,
} from 'lucide-react';

export default function CalculatorPage() {
  const [peptideAmount, setPeptideAmount] = useState('10');
  const [waterVolume,   setWaterVolume]   = useState('2');
  const [desiredDose,   setDesiredDose]   = useState('0.25');
  const [doseUnit,      setDoseUnit]      = useState<'mg' | 'mcg'>('mg');
  const [syringeType,   setSyringeType]   = useState<'u100' | 'u40'>('u100');

  const peptideMg   = parseFloat(peptideAmount) || 0;
  const waterMl     = parseFloat(waterVolume)   || 0;
  const doseMg      = doseUnit === 'mg'
    ? parseFloat(desiredDose) || 0
    : (parseFloat(desiredDose) || 0) / 1000;

  const concentration   = waterMl > 0 ? peptideMg / waterMl : 0;
  const injectionVolume = concentration > 0 ? doseMg / concentration : 0;
  const unitsPerMl      = syringeType === 'u100' ? 100 : 40;
  const injectionUnits   = injectionVolume * unitsPerMl;

  const reset = () => {
    setPeptideAmount('10');
    setWaterVolume('2');
    setDesiredDose('0.25');
    setDoseUnit('mg');
    setSyringeType('u100');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-16 pb-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center ring-1 ring-emerald-500/30">
              <CalculatorIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold uppercase tracking-wider ring-1 ring-amber-500/20">
              <ShieldAlert className="w-3 h-3" />
              Research Use Only
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4">
            Peptide Reconstitution<br />Calculator
          </h1>
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
            Determine the exact injection volume and syringe units for your reconstituted peptide — accurate, instant, and easy to read.
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10 -mt-8 pb-20">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Input Panel ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Peptide Amount */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Peptide Amount in Vial</h3>
                  <p className="text-xs text-slate-500">Total powder mass before reconstitution</p>
                </div>
              </div>
              <div className="flex items-stretch gap-3">
                <input
                  type="number"
                  value={peptideAmount}
                  onChange={(e) => setPeptideAmount(e.target.value)}
                  placeholder="10"
                  step={0.1}
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500 bg-slate-50 transition-colors"
                />
                <span className="flex items-center px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">mg</span>
              </div>
            </div>

            {/* Bacteriostatic Water */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Bacteriostatic Water</h3>
                  <p className="text-xs text-slate-500">Volume of diluent added to the vial</p>
                </div>
              </div>
              <div className="flex items-stretch gap-3">
                <input
                  type="number"
                  value={waterVolume}
                  onChange={(e) => setWaterVolume(e.target.value)}
                  placeholder="2"
                  step={0.1}
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500 bg-slate-50 transition-colors"
                />
                <span className="flex items-center px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">mL</span>
              </div>
            </div>

            {/* Desired Dose */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Syringe className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Desired Dose per Injection</h3>
                  <p className="text-xs text-slate-500">Your target dose for each administration</p>
                </div>
              </div>
              <div className="flex items-stretch gap-3">
                <input
                  type="number"
                  value={desiredDose}
                  onChange={(e) => setDesiredDose(e.target.value)}
                  placeholder="0.25"
                  step={0.01}
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-violet-500 bg-slate-50 transition-colors"
                />
                <div className="flex rounded-xl overflow-hidden border-2 border-slate-200">
                  {(['mg', 'mcg'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setDoseUnit(u)}
                      className={`px-4 text-sm font-bold transition-colors ${
                        doseUnit === u
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Syringe Type */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Syringe Type</h3>
                  <p className="text-xs text-slate-500">Insulin syringe graduation</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'u100', label: 'U-100', sub: '100 units / mL' },
                  { key: 'u40',  label: 'U-40',  sub: '40 units / mL' },
                ] as const).map(({ key, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => setSyringeType(key)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      syringeType === key
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-base font-bold">{label}</div>
                    <div className={`text-xs mt-0.5 ${syringeType === key ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </button>
          </div>

          {/* ── Results Panel (sticky on desktop) ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Results</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Concentration — primary metric */}
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Concentration</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white tabular-nums">
                        {concentration.toFixed(2)}
                      </span>
                      <span className="text-lg font-bold text-emerald-400">mg/mL</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5">
                      {peptideMg.toFixed(1)} mg in {waterMl.toFixed(1)} mL
                    </div>
                  </div>

                  {/* Injection Volume */}
                  <div className="bg-emerald-600/15 rounded-xl p-5 border border-emerald-500/25">
                    <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider mb-2">Injection Volume</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tabular-nums">
                        {injectionVolume.toFixed(3)}
                      </span>
                      <span className="text-base font-bold text-emerald-400">mL</span>
                    </div>
                  </div>

                  {/* Syringe Units */}
                  <div className="bg-blue-600/15 rounded-xl p-5 border border-blue-500/25">
                    <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wider mb-2">
                      {syringeType === 'u100' ? 'U-100' : 'U-40'} Syringe Units
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tabular-nums">
                        {injectionUnits.toFixed(1)}
                      </span>
                      <span className="text-base font-bold text-blue-400">units</span>
                    </div>
                  </div>

                  {/* Quick reference */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Dose per injection</span>
                      <span className="text-white font-semibold">{doseMg.toFixed(4)} mg</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Total injections in vial</span>
                      <span className="text-white font-semibold">
                        {doseMg > 0 ? Math.floor(peptideMg / doseMg) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="mt-16">
          <h2 className="text-2xl font-black text-slate-900 mb-2">How It Works</h2>
          <p className="text-slate-500 mb-8">Four quick steps to accurate dosing.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Beaker,    title: 'Enter peptide mass', desc: 'Total mg of lyophilized powder in the vial.' },
              { icon: Droplets,  title: 'Add diluent volume',   desc: 'Amount of bacteriostatic water used (mL).' },
              { icon: Syringe,   title: 'Set desired dose',     desc: 'Your target dose per injection in mg or mcg.' },
              { icon: CheckCircle2, title: 'Read your result',   desc: 'Injection volume in mL and syringe units.' },
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <step.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Safety Notes ── */}
        <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-amber-900">Safety Notes</h2>
          </div>
          <ul className="space-y-2.5">
            {[
              'Always use bacteriostatic water for reconstitution — never plain saline or tap water.',
              'Inject water slowly down the side of the vial, never directly onto the powder.',
              'Gently swirl to dissolve — do not shake the vial.',
              'Store reconstituted peptides refrigerated at 2–8°C and protect from light.',
              'Use insulin syringes for the most accurate measurement.',
              'This calculator is for research and educational purposes only — not medical advice.',
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
                <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Storage tip ── */}
        <div className="mt-6 bg-slate-900 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-0.5">Storage Reminder</h3>
            <p className="text-xs text-slate-400">Keep reconstituted vials at 2–8°C. Most peptides remain stable for 14–30 days after reconstitution.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
