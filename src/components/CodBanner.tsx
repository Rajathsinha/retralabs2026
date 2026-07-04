import { useEffect, useState } from 'react';

export default function CodBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 5000);
    const hideTimer = setTimeout(() => setVisible(false), 10000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(20px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        zIndex: 9999,
        background: '#16a34a',
        color: '#fff',
        padding: '12px 22px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: '0.01em',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 32px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>✅</span>
      <span>Cash on Delivery (COD) Available</span>
    </div>
  );
}
