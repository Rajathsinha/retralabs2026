import { useState } from 'react';
import { Plus, X, FileText, RefreshCw, Wand2, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onRefresh: () => void;
  onCreateOrder?: () => void;
  onPrintLabels?: () => void;
  onSmartFormat?: () => void;
  onSmartClean?: () => void;
  onOpenAiCopilot?: () => void;
}

export function QuickActions({
  onRefresh,
  onCreateOrder,
  onPrintLabels,
  onSmartFormat,
  onSmartClean,
  onOpenAiCopilot,
}: QuickActionsProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    ...(onOpenAiCopilot ? [{ label: 'Ask AI Copilot ✨', icon: Sparkles, onClick: onOpenAiCopilot }] : []),
    { label: 'Paste / Create Order', icon: Plus, onClick: onCreateOrder },
    ...(onSmartFormat ? [{ label: 'Smart AI Formatter', icon: Wand2, onClick: onSmartFormat }] : []),
    ...(onSmartClean ? [{ label: 'Smart AI Cleaner', icon: Sparkles, onClick: onSmartClean }] : []),
    { label: 'Generate Shipping Label', icon: FileText, onClick: onPrintLabels },
    { label: 'Refresh Orders', icon: RefreshCw, onClick: onRefresh },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 mb-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 min-w-[200px] animate-[fadeIn_0.15s_ease]">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => { a.onClick?.(); setOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Icon className="w-4 h-4 text-slate-500" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-[#2563EB] text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-[#1D4ED8] hover:scale-105 transition-all"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
