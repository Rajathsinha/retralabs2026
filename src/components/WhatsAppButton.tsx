import { useState } from 'react';
import { MessageCircle, X, ArrowLeft } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../constants/config';

const PHONE = WHATSAPP_NUMBER;

const REFERRAL_SOURCES = ['YouTube', 'Instagram', 'Reddit', 'Friend', 'Google', 'Twitter / X', 'TikTok', 'IndiaMART'];

const QUICK_MESSAGES = [
  {
    label: 'Ask about my order',
    text: "Hi! I'd like to ask about my RetraLabs order. Can you help?",
  },
  {
    label: 'Product inquiry',
    text: "Hi! I'm interested in ordering from RetraLabs. Can you help me choose the right compound for my research?",
  },
];

export default function WhatsAppButton() {
  const [expanded, setExpanded]           = useState(false);
  const [referralSource, setReferralSource] = useState<string | null>(null);
  const [friendName, setFriendName]       = useState('');

  const handleClose = () => {
    setExpanded(false);
    setReferralSource(null);
    setFriendName('');
  };

  const handleSelectSource = (src: string) => {
    if (src !== 'Friend') setFriendName('');
    setReferralSource(src);
  };

  const openChat = (message: string) => {
    const sourceLine = referralSource
      ? `\n\n(Found RetraLabs via: ${referralSource}${referralSource === 'Friend' && friendName ? ` — referred by ${friendName}` : ''})`
      : '';
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(message + sourceLine)}`, '_blank');
    handleClose();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Panel */}
      {expanded && (
        <div
          className="w-72 shadow-2xl border border-white/10 bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-200 rounded-2xl"
        >
          <div className="bg-emerald-600 rounded-t-xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {referralSource && (
                <button
                  className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0 -ml-1 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                  onClick={() => { setReferralSource(null); setFriendName(''); }}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm leading-tight truncate">RetraLabs Support</p>
                <p className="text-emerald-100 text-xs truncate">Typically replies within minutes</p>
              </div>
            </div>
            <button
              className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              onClick={handleClose}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-slate-900/50">
            {!referralSource ? (
              /* ── Step 1: How did you find us? ── */
              <>
                <p className="text-xs text-slate-400 mb-3 px-1">
                  Before we chat — how did you find us? <span className="text-emerald-400 font-semibold">*</span>
                </p>
                <div className="flex flex-col gap-2">
                  {REFERRAL_SOURCES.map((src) => (
                    <button
                      key={src}
                      className="justify-start text-left h-auto py-3 px-4 text-sm font-medium bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 hover:text-emerald-100 border border-emerald-800/50 hover:border-emerald-600/60 transition-all duration-200 rounded-xl"
                      onClick={() => handleSelectSource(src)}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* ── Step 2: Topic selection (+ friend name if applicable) ── */
              <>
                {referralSource === 'Friend' && (
                  <div className="mb-3">
                    <input
                      placeholder="Friend's name (optional)"
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:border-emerald-600 transition-colors"
                    />
                  </div>
                )}
                <div className="mb-3 px-1 py-2 bg-amber-950/40 border border-amber-700/40 rounded-lg">
                  <p className="text-xs text-amber-300 font-semibold leading-snug">
                    ⚠️ No dosage or medical guidance. All products are strictly for research use only.
                  </p>
                </div>
                <p className="text-xs text-slate-400 mb-3 px-1">How can we help?</p>
                <div className="flex flex-col gap-2">
                  {QUICK_MESSAGES.map((msg) => (
                    <button
                      key={msg.label}
                      className="justify-start text-left h-auto py-3 px-4 text-sm font-medium bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 hover:text-emerald-100 border border-emerald-800/50 hover:border-emerald-600/60 transition-all duration-200 rounded-xl"
                      onClick={() => openChat(msg.text)}
                    >
                      {msg.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="relative">
        {!expanded && (
          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20 pointer-events-none" />
        )}
        <button
          className={`relative bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl shadow-emerald-900/40 transition-all duration-300 hover:scale-105 active:scale-95 w-14 h-14 rounded-full flex items-center justify-center ${
            expanded ? 'bg-emerald-600 scale-105' : ''
          }`}
          onClick={() => setExpanded((prev) => !prev)}
          aria-label="Chat with RetraLabs Support on WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
