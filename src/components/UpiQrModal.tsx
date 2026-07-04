import { useState, useRef } from 'react';
import { X, CheckCircle, MessageCircle, Upload, Copy } from 'lucide-react';

const UPI_ID = '7019917927@superyes';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleConfirm = async () => {
    if (!txnRef.trim() || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(txnRef.trim(), screenshot);
    } finally {
      setConfirming(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 400,
        background: '#040C1E', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ background: 'linear-gradient(135deg,#00C896,#00A3FF)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>RL</span>
              </div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>RetraLabs</span>
              <span style={{ background: 'rgba(0,200,150,0.15)', color: '#00C896', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(0,200,150,0.3)' }}>UPI · VERIFIED</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Scan to Pay</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        {/* Amount */}
        <div style={{ padding: '12px 20px 0' }}>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 4px' }}>Complete your payment securely</p>
          <p style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            ₹{amount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* QR Code */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 12, textAlign: 'center' }}>
            <img
              src="/retralabs-payment-qr.png"
              alt="RetraLabs UPI QR"
              style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block', margin: '0 auto', borderRadius: 8 }}
              onError={(e) => {
                // Fallback if image not yet saved
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* UPI ID */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>UPI ID</p>
              <p style={{ color: '#00C896', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{UPI_ID}</p>
            </div>
            <button onClick={copyUpiId} style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#00C896', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Copy size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Transaction ref input */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              UPI Reference / UTR Number *
            </label>
            <input
              type="text"
              value={txnRef}
              onChange={e => setTxnRef(e.target.value)}
              placeholder="Paste your transaction reference here"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${txnRef ? 'rgba(0,200,150,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Screenshot upload */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              Payment Screenshot (optional)
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)',
                color: screenshot ? '#00C896' : '#64748b', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Upload size={14} />
              {screenshot ? screenshot.name : 'Upload screenshot'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setScreenshot(e.target.files?.[0] || null)} />
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!txnRef.trim() || confirming}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: txnRef.trim() ? 'linear-gradient(135deg,#00C896,#00A3FF)' : 'rgba(255,255,255,0.08)',
              color: txnRef.trim() ? '#fff' : '#475569',
              fontWeight: 800, fontSize: 15, cursor: txnRef.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {confirming ? (
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                <CheckCircle size={18} />
                Confirm Payment
              </>
            )}
          </button>

          {/* WhatsApp fallback */}
          <button
            onClick={() => { window.open(whatsappUrl, '_blank'); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 0' }}
          >
            <MessageCircle size={14} />
            Having trouble? Order via WhatsApp instead
          </button>
        </div>
      </div>
    </div>
  );
}
