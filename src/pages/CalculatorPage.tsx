import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator as CalculatorIcon,
  Beaker,
  Syringe,
  Droplets,
  FlaskConical,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export default function CalculatorPage() {
  useSEO({ title: 'Peptide Reconstitution Calculator | RetraLabs', description: 'Calculate peptide reconstitution concentration and injection volume.', noindex: true });
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
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* ── Compact Header ── */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-6 lg:px-10 pt-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center ring-1 ring-emerald-500/30">
              <CalculatorIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                Peptide Reconstitution Calculator
              </h1>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider ring-1 ring-amber-500/20 ml-auto">
              <ShieldAlert className="w-3 h-3" />
              Research Use Only
            </span>
          </div>
        </div>
      </div>

      {/* ── Calculator (single screen) ── */}
      <div className="flex-1 flex items-start justify-center px-4 lg:px-10 -mt-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-5">

          {/* ── Inputs ── */}
          <div className="space-y-4">
            {/* Peptide Amount */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Beaker className="w-4 h-4 text-emerald-600" />
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
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500 bg-slate-50 transition-colors"
                />
                <span className="flex items-center px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">mg</span>
              </div>
            </div>

            {/* Bacteriostatic Water */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-blue-600" />
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
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500 bg-slate-50 transition-colors"
                />
                <span className="flex items-center px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">mL</span>
              </div>
            </div>

            {/* Desired Dose */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Syringe className="w-4 h-4 text-violet-600" />
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
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-violet-500 bg-slate-50 transition-colors"
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-rose-600" />
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
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      syringeType === key
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-sm font-bold">{label}</div>
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

          {/* ── Results ── */}
          <div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Results</h3>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {/* Concentration */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Concentration</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tabular-nums">
                      {concentration.toFixed(2)}
                    </span>
                    <span className="text-base font-bold text-emerald-400">mg/mL</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {peptideMg.toFixed(1)} mg in {waterMl.toFixed(1)} mL
                  </div>
                </div>

                {/* Injection Volume */}
                <div className="bg-emerald-600/15 rounded-xl p-4 border border-emerald-500/25">
                  <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider mb-1.5">Injection Volume</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white tabular-nums">
                      {injectionVolume.toFixed(3)}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">mL</span>
                  </div>
                </div>

                {/* Syringe Units */}
                <div className="bg-blue-600/15 rounded-xl p-4 border border-blue-500/25">
                  <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wider mb-1.5">
                    {syringeType === 'u100' ? 'U-100' : 'U-40'} Syringe Units
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white tabular-nums">
                      {injectionUnits.toFixed(1)}
                    </span>
                    <span className="text-sm font-bold text-blue-400">units</span>
                  </div>
                </div>

                {/* Quick reference */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
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

            {/* Safety note */}
            <p className="text-[11px] text-slate-400 leading-relaxed mt-3 px-1">
              For research and educational purposes only. Use bacteriostatic water for reconstitution, inject slowly down the side of the vial, and store reconstituted peptides at 2–8°C.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
