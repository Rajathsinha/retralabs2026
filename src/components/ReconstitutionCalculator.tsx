import { useState, useEffect } from 'react';
import { Calculator, Beaker, Syringe, Droplets, X, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReconstitutionCalculator({ isOpen, onClose }: Props) {
  const [peptideAmount, setPeptideAmount] = useState('10');
  const [waterVolume,   setWaterVolume]   = useState('2');
  const [desiredDose,   setDesiredDose]   = useState('0.25');
  const [doseUnit,      setDoseUnit]      = useState<'mg' | 'mcg'>('mg');
  const [syringeType,   setSyringeType]   = useState<'u100' | 'u40'>('u100');

  /* Lock body scroll while open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const peptideMg   = parseFloat(peptideAmount) || 0;
  const waterMl     = parseFloat(waterVolume)   || 0;
  const doseMg      = doseUnit === 'mg'
    ? parseFloat(desiredDose) || 0
    : (parseFloat(desiredDose) || 0) / 1000;

  const concentration    = waterMl > 0 ? peptideMg / waterMl : 0;
  const injectionVolume  = concentration > 0 ? doseMg / concentration : 0;
  const unitsPerMl       = syringeType === 'u100' ? 100 : 40;
  const injectionUnits   = injectionVolume * unitsPerMl;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl flex-shrink-0">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight">Reconstitution Calculator</h2>
            <p className="text-xs text-slate-400">Calculate peptide dosing</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* Warning */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
            <p className="text-xs text-amber-900">
              <strong>RESEARCH USE ONLY</strong> — For educational and research purposes.
              Consult qualified professionals for medical advice.
            </p>
          </div>

          {/* Peptide Amount */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Peptide Amount in Vial</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={peptideAmount}
                onChange={(e) => setPeptideAmount(e.target.value)}
                placeholder="10"
                step={0.1}
                className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2.5 text-base font-semibold text-slate-900 focus:outline-none focus:border-slate-500 bg-white"
              />
              <span className="text-sm font-bold text-slate-600 bg-white px-3 py-2.5 rounded-lg border-2 border-slate-200 flex-shrink-0">mg</span>
            </div>
          </div>

          {/* Bacteriostatic Water */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Bacteriostatic Water</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={waterVolume}
                onChange={(e) => setWaterVolume(e.target.value)}
                placeholder="2"
                step={0.1}
                className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2.5 text-base font-semibold text-slate-900 focus:outline-none focus:border-slate-500 bg-white"
              />
              <span className="text-sm font-bold text-slate-600 bg-white px-3 py-2.5 rounded-lg border-2 border-slate-200 flex-shrink-0">mL</span>
            </div>
          </div>

          {/* Desired Dose */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Syringe className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Desired Dose per Injection</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={desiredDose}
                onChange={(e) => setDesiredDose(e.target.value)}
                placeholder="0.25"
                step={0.01}
                className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2.5 text-base font-semibold text-slate-900 focus:outline-none focus:border-slate-500 bg-white"
              />
              {/* Native select with styled wrapper */}
              <div className="relative flex-shrink-0">
                <select
                  value={doseUnit}
                  onChange={(e) => setDoseUnit(e.target.value as 'mg' | 'mcg')}
                  className="appearance-none bg-white border-2 border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-500 cursor-pointer"
                >
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Syringe Type */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Syringe className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Syringe Type</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'u100', label: 'U-100 (100 units/mL)' },
                { key: 'u40',  label: 'U-40 (40 units/mL)' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSyringeType(key)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    syringeType === key
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-white mb-4 text-center uppercase tracking-wider">Results</h3>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 mb-3">
              <div className="text-xs text-slate-400 mb-1">Concentration</div>
              <div className="text-2xl font-extrabold text-white">
                {concentration.toFixed(2)} <span className="text-base text-emerald-400">mg/mL</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-4">
                <div className="text-[10px] text-emerald-300 mb-1 font-semibold uppercase tracking-wider">Inject Volume</div>
                <div className="text-xl font-extrabold text-white">
                  {injectionVolume.toFixed(3)} <span className="text-xs">mL</span>
                </div>
              </div>
              <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-4">
                <div className="text-[10px] text-emerald-300 mb-1 font-semibold uppercase tracking-wider">
                  {syringeType === 'u100' ? 'U-100' : 'U-40'} Units
                </div>
                <div className="text-xl font-extrabold text-white">
                  {injectionUnits.toFixed(1)} <span className="text-xs">units</span>
                </div>
              </div>
            </div>
          </div>

          {/* How to use & Safety accordion (native) */}
          <details className="border border-slate-200 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 select-none">
              How to Use
            </summary>
            <ol className="px-4 pb-4 space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-3">
              <li className="flex gap-2"><span className="font-bold text-emerald-600">1.</span><span>Enter the total peptide amount in your vial (e.g., 10mg)</span></li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">2.</span><span>Enter bacteriostatic water amount (e.g., 2mL)</span></li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">3.</span><span>Enter your desired dose per injection</span></li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">4.</span><span>Read injection volume in mL and syringe units</span></li>
            </ol>
          </details>

          <details className="border border-slate-200 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 select-none">
              Safety Notes
            </summary>
            <ul className="px-4 pb-4 space-y-1.5 text-xs text-rose-800 border-t border-slate-100 pt-3">
              <li>— Always use bacteriostatic water for reconstitution</li>
              <li>— Inject water slowly down the vial side, never onto powder</li>
              <li>— Gently swirl (do not shake) until dissolved</li>
              <li>— Store reconstituted peptides at 2–8°C</li>
              <li>— Use insulin syringes for accurate measurement</li>
            </ul>
          </details>

          {/* Bottom padding for scroll breathing room */}
          <div className="h-2" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
