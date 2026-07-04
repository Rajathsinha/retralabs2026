import { useState } from 'react';
import { Button, Card, CardHeader, CardBody, Input } from '@heroui/react';
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
        <Card
          className="w-72 shadow-2xl border border-white/10 bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-200"
          radius="lg"
        >
          <CardHeader className="bg-emerald-600 rounded-t-xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {referralSource && (
                <Button
                  isIconOnly variant="light" size="sm" radius="full"
                  className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0 -ml-1"
                  onPress={() => { setReferralSource(null); setFriendName(''); }}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm leading-tight truncate">RetraLabs Support</p>
                <p className="text-emerald-100 text-xs truncate">Typically replies within minutes</p>
              </div>
            </div>
            <Button
              isIconOnly variant="light" size="sm" radius="full"
              className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
              onPress={handleClose}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardBody className="p-3 bg-slate-900/50">
            {!referralSource ? (
              /* ── Step 1: How did you find us? ── */
              <>
                <p className="text-xs text-slate-400 mb-3 px-1">
                  Before we chat — how did you find us? <span className="text-emerald-400 font-semibold">*</span>
                </p>
                <div className="flex flex-col gap-2">
                  {REFERRAL_SOURCES.map((src) => (
                    <Button
                      key={src}
                      variant="flat"
                      color="success"
                      size="sm"
                      radius="lg"
                      className="justify-start text-left h-auto py-3 px-4 text-sm font-medium bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 hover:text-emerald-100 border border-emerald-800/50 hover:border-emerald-600/60 transition-all duration-200"
                      onPress={() => handleSelectSource(src)}
                    >
                      {src}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              /* ── Step 2: Topic selection (+ friend name if applicable) ── */
              <>
                {referralSource === 'Friend' && (
                  <div className="mb-3">
                    <Input
                      size="sm"
                      placeholder="Friend's name (optional)"
                      value={friendName}
                      onValueChange={setFriendName}
                      variant="bordered"
                      classNames={{
                        input: 'text-white text-sm',
                        inputWrapper: 'bg-slate-800 border-slate-700 hover:border-emerald-600 focus-within:border-emerald-500',
                      }}
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
                    <Button
                      key={msg.label}
                      variant="flat"
                      color="success"
                      size="sm"
                      radius="lg"
                      className="justify-start text-left h-auto py-3 px-4 text-sm font-medium bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 hover:text-emerald-100 border border-emerald-800/50 hover:border-emerald-600/60 transition-all duration-200"
                      onPress={() => openChat(msg.text)}
                    >
                      {msg.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Floating Action Button */}
      <div className="relative">
        {!expanded && (
          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20 pointer-events-none" />
        )}
        <Button
          isIconOnly
          radius="full"
          size="lg"
          className={`relative bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl shadow-emerald-900/40 transition-all duration-300 hover:scale-105 active:scale-95 w-14 h-14 ${
            expanded ? 'bg-emerald-600 scale-105' : ''
          }`}
          onPress={() => setExpanded((prev) => !prev)}
          aria-label="Chat with RetraLabs Support on WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
