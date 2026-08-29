import { useState, useRef, useEffect, useCallback } from 'react';
import { X, CheckCircle, MessageCircle, Upload, Copy, Shield, Lock, QrCode, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

const UPI_ID = 'retralabs@ptaxis';
const MERCHANT_NAME = 'RetraLabs';
const COUNTDOWN_SECONDS = 180;

type Stage = 'idle' | 'verifying' | 'success' | 'expired';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: (txnRef: string, screenshot: File | null) => Promise<void>;
  whatsappUrl: string;
}

export default function UpiQrModal({ isOpen, onClose, amount, onConfirm, whatsappUrl }: UpiQrModalProps) {
  const [txnRef, setTxnRef] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [stage, setStage] = useState<Stage>('idle');
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mount animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setStage('idle');
      setSecondsLeft(COUNTDOWN_SECONDS);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || stage === 'success' || stage === 'expired') return;
    if (secondsLeft <= 0) {
      setStage('expired');
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, secondsLeft, stage]);

  const handleConfirm = useCallback(async () => {
    if (!txnRef.trim() || confirming || stage === 'expired') return;
    setConfirming(true);
    setStage('verifying');
    try {
      await onConfirm(txnRef.trim(), screenshot);
      setStage('success');
    } catch {
      setStage('idle');
    } finally {
      setConfirming(false);
    }
  }, [txnRef, confirming, stage, onConfirm, screenshot]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;
  const isLow = secondsLeft <= 30;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 16, overflow: 'auto',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
          marginTop: 'max(20px, 8vh)',
          background: 'linear-gradient(180deg, #0B1226 0%, #060B1A 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 32px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,200,150,0.06)',
          marginBottom: 20,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 3, width: '100%',
          background: 'linear-gradient(90deg, #00C896 0%, #00A3FF 50%, #00C896 100%)',
          backgroundSize: '200% 100%',
          animation: 'rl-shimmer 3s linear infinite',
        }} />

        {/* ── Header / Merchant ── */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                background: 'linear-gradient(135deg,#00C896,#00A3FF)',
                borderRadius: 10, width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,200,150,0.35)',
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '-0.02em' }}>RL</span>
              </div>
              <div>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, display: 'block', lineHeight: 1.1 }}>{MERCHANT_NAME}</span>
                <span style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Secure Checkout</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10,
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Amount + countdown ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount Payable</p>
              <p style={{
                color: '#fff', fontSize: 38, fontWeight: 900, margin: 0, letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#94a3b8', marginRight: 2 }}>₹</span>
                {amount.toLocaleString('en-IN')}
              </p>
            </div>
            {/* Countdown chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: stage === 'expired'
                ? 'rgba(239,68,68,0.12)'
                : isLow ? 'rgba(251,191,36,0.12)' : 'rgba(0,200,150,0.1)',
              border: `1px solid ${stage === 'expired' ? 'rgba(239,68,68,0.3)' : isLow ? 'rgba(251,191,36,0.3)' : 'rgba(0,200,150,0.25)'}`,
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: stage === 'expired' ? '#ef4444' : isLow ? '#fbbf24' : '#00C896',
                boxShadow: `0 0 8px ${stage === 'expired' ? '#ef4444' : isLow ? '#fbbf24' : '#00C896'}`,
                animation: stage === 'expired' ? 'none' : 'rl-pulse 1.2s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                color: stage === 'expired' ? '#fca5a5' : isLow ? '#fcd34d' : '#00C896',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {stage === 'expired' ? 'Expired' : `${mm}:${ss}`}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 99,
              background: stage === 'expired'
                ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                : isLow ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#00C896,#00A3FF)',
              transition: 'width 1s linear, background 0.3s ease',
            }} />
          </div>
        </div>

        {/* ── Success state ── */}
        {stage === 'success' ? (
          <div style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              animation: 'rl-pop 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <CheckCircle size={36} style={{ color: '#00C896' }} />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Payment Received</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>Your order is confirmed. We'll dispatch it shortly.</p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#00C896,#00A3FF)',
                color: '#fff', fontWeight: 800, fontSize: 14,
                boxShadow: '0 8px 24px rgba(0,200,150,0.3)',
              }}
            >
              Done
            </button>
          </div>
        ) : stage === 'expired' ? (
          /* ── Expired state ── */
          <div style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle size={36} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Session Expired</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>The payment window closed. Please restart to get a fresh QR.</p>
            <button
              onClick={() => { setStage('idle'); setSecondsLeft(COUNTDOWN_SECONDS); setTxnRef(''); setScreenshot(null); }}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#00C896,#00A3FF)',
                color: '#fff', fontWeight: 800, fontSize: 14,
              }}
            >
              Restart Payment
            </button>
          </div>
        ) : (
          <>
            {/* ── QR Code ── */}
            <div style={{ padding: '18px 20px 0' }}>
              <div style={{
                position: 'relative',
                background: '#fff', borderRadius: 18, padding: 14, textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              }}>
                <img
                  src="/retralabs-payment-qr.png"
                  alt="RetraLabs UPI QR"
                  style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block', margin: '0 auto', borderRadius: 10 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Scanning overlay */}
                <div style={{
                  position: 'absolute', left: 14, right: 14, top: 14, bottom: 14,
                  borderRadius: 10, overflow: 'hidden', pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, #00C896, transparent)',
                    boxShadow: '0 0 12px #00C896',
                    animation: 'rl-scan 2.5s ease-in-out infinite',
                  }} />
                </div>
              </div>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 600, margin: '10px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Scan with any UPI app to pay
              </p>
            </div>

            {/* ── UPI ID ── */}
            <div style={{ padding: '14px 20px 0' }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'border-color 0.2s',
              }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 3px' }}>UPI ID</p>
                  <p style={{ color: '#00C896', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace', letterSpacing: '-0.01em' }}>{UPI_ID}</p>
                </div>
                <button
                  onClick={copyUpiId}
                  style={{
                    background: copied ? 'rgba(0,200,150,0.18)' : 'rgba(0,200,150,0.08)',
                    border: '1px solid rgba(0,200,150,0.3)', borderRadius: 9,
                    padding: '7px 14px', cursor: 'pointer', color: '#00C896',
                    fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* ── Status stepper ── */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <StepCircle icon={<QrCode size={13} />} label="Scan" active done={stage === 'verifying'} />
                <StepLine done={stage === 'verifying'} />
                <StepCircle
                  icon={stage === 'verifying' ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                  label="Verify"
                  active={stage === 'verifying'}
                  done={stage === 'verifying'}
                />
                <StepLine done={false} />
                <StepCircle icon={<CheckCircle size={13} />} label="Done" active={false} done={false} />
              </div>
            </div>

            {/* ── Form ── */}
            <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                  UPI Reference / UTR Number *
                </label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={e => setTxnRef(e.target.value)}
                  placeholder="Paste your 12-digit UTR here"
                  style={{
                    width: '100%', padding: '13px 15px', borderRadius: 11, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${txnRef ? 'rgba(0,200,150,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'monospace',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)'; e.currentTarget.style.background = 'rgba(0,200,150,0.04)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = txnRef ? 'rgba(0,200,150,0.5)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                />
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                  Payment Screenshot (optional)
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 11, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.14)',
                    color: screenshot ? '#00C896' : '#64748b', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <Upload size={14} />
                  {screenshot ? screenshot.name : 'Upload screenshot'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setScreenshot(e.target.files?.[0] || null)} />
              </div>

              <button
                onClick={handleConfirm}
                disabled={!txnRef.trim() || confirming}
                className="active:scale-[0.97]"
                style={{
                  width: '100%', padding: '15px', borderRadius: 13, border: 'none',
                  background: txnRef.trim() && !confirming
                    ? 'linear-gradient(135deg,#00C896,#00A3FF)'
                    : 'rgba(255,255,255,0.06)',
                  color: txnRef.trim() && !confirming ? '#fff' : '#475569',
                  fontWeight: 800, fontSize: 15,
                  cursor: txnRef.trim() && !confirming ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.25s ease',
                  boxShadow: txnRef.trim() && !confirming ? '0 10px 30px rgba(0,200,150,0.25)' : 'none',
                }}
              >
                {confirming ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    I've Paid — Verify Now
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              <button
                onClick={() => { window.open(whatsappUrl, '_blank'); onClose(); }}
                style={{
                  background: 'none', border: 'none', color: '#475569', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '4px 0', transition: 'color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
              >
                <MessageCircle size={13} />
                Having trouble? Order via WhatsApp instead
              </button>
            </div>
          </>
        )}

        {/* ── Security footer ── */}
        <div style={{
          padding: '14px 20px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Shield size={12} style={{ color: '#475569' }} />
          <span style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>
            256-bit encrypted · RetraLabs Secure Checkout
          </span>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes rl-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes rl-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes rl-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes rl-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StepCircle({ icon, label, active, done }: { icon: React.ReactNode; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? 'rgba(0,200,150,0.15)' : active ? 'rgba(0,163,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${done ? 'rgba(0,200,150,0.5)' : active ? 'rgba(0,163,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: done ? '#00C896' : active ? '#00A3FF' : '#64748b',
        transition: 'all 0.3s ease',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: done ? '#00C896' : active ? '#00A3FF' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div style={{
      flex: 1, height: 1.5, borderRadius: 99, margin: '0 4px', marginBottom: 16,
      background: done ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.08)',
      transition: 'background 0.3s ease',
    }} />
  );
}
