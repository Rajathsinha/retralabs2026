import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const PARTICLES = [
  { x: 8,  y: 15, s: 1.5, d: 0.2, t: 5.5 }, { x: 22, y: 72, s: 1,   d: 1.1, t: 7   },
  { x: 38, y: 33, s: 2,   d: 0.7, t: 6   }, { x: 55, y: 88, s: 1.5, d: 1.8, t: 4.5 },
  { x: 68, y: 20, s: 1,   d: 0.4, t: 8   }, { x: 80, y: 55, s: 2,   d: 2.1, t: 5   },
  { x: 12, y: 50, s: 1.5, d: 1.5, t: 6.5 }, { x: 45, y: 10, s: 1,   d: 0.9, t: 7.5 },
  { x: 90, y: 78, s: 2,   d: 0.3, t: 4   }, { x: 60, y: 42, s: 1,   d: 1.3, t: 9   },
  { x: 74, y: 8,  s: 1.5, d: 2.4, t: 5   }, { x: 32, y: 95, s: 1,   d: 0.8, t: 6   },
  { x: 85, y: 35, s: 2,   d: 1.6, t: 7   }, { x: 5,  y: 80, s: 1,   d: 0.5, t: 8   },
  { x: 50, y: 60, s: 1.5, d: 2,   t: 5.5 }, { x: 18, y: 38, s: 1,   d: 1.2, t: 6.5 },
];

const CITIES = [
  { cx: 145, cy: 90,  r: 4,   label: 'Delhi',     d: '0s'   },
  { cx: 100, cy: 190, r: 3.5, label: 'Mumbai',    d: '0.4s' },
  { cx: 145, cy: 265, r: 3.5, label: 'Bangalore', d: '0.8s' },
  { cx: 178, cy: 272, r: 3,   label: 'Chennai',   d: '1.1s' },
  { cx: 155, cy: 228, r: 3,   label: 'Hyderabad', d: '0.6s' },
  { cx: 215, cy: 158, r: 3,   label: 'Kolkata',   d: '0.9s' },
  { cx: 112, cy: 210, r: 2.5, label: 'Pune',      d: '0.5s' },
  { cx: 95,  cy: 152, r: 2.5, label: 'Ahmedabad', d: '0.3s' },
  { cx: 130, cy: 108, r: 2.5, label: 'Jaipur',    d: '0.7s' },
  { cx: 168, cy: 112, r: 2.5, label: 'Lucknow',   d: '1s'   },
];

const EDGES = [
  [0,1],[0,8],[0,9],[0,5],[1,2],[1,6],[2,3],[2,4],[3,4],[4,5],[5,9],[6,7],[7,1],[8,9],
];

function ModalContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2, 6, 20, 0.88)',
        backdropFilter: 'blur(20px)',
        padding: '16px',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes cod-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes cod-pulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}
        @keyframes cod-particle{0%{transform:translateY(0) scale(1);opacity:0}15%{opacity:.9}80%{opacity:.7}100%{transform:translateY(-55px) scale(.4);opacity:0}}
        @keyframes cod-trail{0%{stroke-dashoffset:300;opacity:0}40%{opacity:.5}100%{stroke-dashoffset:-300;opacity:0}}
        @keyframes cod-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes cod-shimmer{0%{background-position:-400% center}100%{background-position:400% center}}
        @keyframes cod-in{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes cod-glow-pulse{0%,100%{box-shadow:0 0 20px rgba(59,130,246,.2)}50%{box-shadow:0 0 40px rgba(59,130,246,.5)}}
      `}</style>

      {/* Panel */}
      <div
        style={{
          width: '100%', maxWidth: 780,
          background: 'linear-gradient(145deg,#040B1D 0%,#071428 60%,#040A1A 100%)',
          borderRadius: 24,
          border: '1px solid rgba(59,130,246,.22)',
          boxShadow: '0 0 0 1px rgba(255,255,255,.04), 0 48px 96px rgba(0,0,0,.9), 0 0 80px rgba(59,130,246,.12)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          animation: 'cod-in .45s cubic-bezier(.16,1,.3,1) both',
        }}
      >
        {/* Top edge glow */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(96,165,250,.7) 40%,rgba(34,211,238,.5) 60%,transparent)' }} />

        {/* Particle field */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          {PARTICLES.map((p, i) => (
            <div key={i} style={{
              position:'absolute',
              left:`${p.x}%`, top:`${p.y}%`,
              width:p.s, height:p.s,
              borderRadius:'50%',
              background:'rgba(96,165,250,0.7)',
              animation:`cod-particle ${p.t}s ease-in ${p.d}s infinite`,
            }} />
          ))}
        </div>

        {/* ── LEFT COLUMN ── */}
        <div style={{ flex:'0 0 52%', padding:'44px 40px 44px 44px', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', zIndex:2 }}>

          {/* Top badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'6px 14px', borderRadius:99,
            background:'rgba(59,130,246,.1)',
            border:'1px solid rgba(59,130,246,.25)',
            width:'fit-content', marginBottom:20,
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#22D3EE', animation:'cod-pulse 2s ease-in-out infinite' }} />
            <span style={{ color:'#93C5FD', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>
              You asked. We delivered.
            </span>
          </div>

          {/* Main headline */}
          <div style={{ marginBottom:20 }}>
            <div style={{
              fontSize: 'clamp(42px, 6vw, 60px)',
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              color: '#EFF6FF',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Cash on
            </div>
            <div style={{
              fontSize: 'clamp(42px, 6vw, 60px)',
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg,#60A5FA,#22D3EE,#60A5FA)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'cod-shimmer 4s linear infinite',
            }}>
              Delivery
            </div>
            <div style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: '#60A5FA',
              marginTop: 10,
            }}>
              Now available across India
            </div>
            <p style={{ color:'rgba(148,163,184,.75)', fontSize:14, lineHeight:1.65, marginTop:10, maxWidth:340 }}>
              Order with confidence. Pay only when your package arrives at your doorstep.
            </p>
          </div>

          {/* Trust grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:28 }}>
            {[
              { icon:'✓', label:'No Upfront Payment' },
              { icon:'✓', label:'Available Across India' },
              { icon:'✓', label:'Secure & Discreet Packaging' },
              { icon:'✓', label:'48h Average Dispatch' },
            ].map((t, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 14px',
                background:'rgba(255,255,255,.04)',
                border:'1px solid rgba(255,255,255,.07)',
                borderRadius:12,
                backdropFilter:'blur(8px)',
              }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%',
                  background:'rgba(34,211,238,.15)',
                  border:'1px solid rgba(34,211,238,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <span style={{ color:'#22D3EE', fontSize:11, fontWeight:700 }}>{t.icon}</span>
                </div>
                <span style={{ color:'rgba(226,232,240,.85)', fontSize:12, fontWeight:500, lineHeight:1.3 }}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
            <button
              onClick={() => { onClose(); navigate('/catalogue'); }}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'14px 28px',
                background:'linear-gradient(135deg,#3B82F6,#06B6D4)',
                borderRadius:12, border:'none', cursor:'pointer',
                color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'0.04em', textTransform:'uppercase',
                boxShadow:'0 0 24px rgba(59,130,246,.4)',
                animation:'cod-glow-pulse 3s ease-in-out infinite',
                transition:'transform .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Shop Now →
            </button>

            {/* Trustpilot pill */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 14px',
              background:'rgba(255,255,255,.05)',
              border:'1px solid rgba(255,255,255,.1)',
              borderRadius:10,
            }}>
              <div style={{ display:'flex', gap:2 }}>
                {[1,2,3,4].map(i => (
                  <span key={i} style={{ color:'#00B67A', fontSize:13 }}>★</span>
                ))}
                <span style={{ color:'rgba(0,182,122,.5)', fontSize:13 }}>★</span>
              </div>
              <span style={{ color:'rgba(226,232,240,.7)', fontSize:12, fontWeight:500 }}>4.5 · Trustpilot</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (visual) ── */}
        <div style={{ flex:'0 0 48%', position:'relative', overflow:'hidden', minHeight:480 }}>

          {/* Background radial glow */}
          <div style={{
            position:'absolute', top:'10%', left:'10%', width:'80%', height:'80%',
            background:'radial-gradient(ellipse at center, rgba(59,130,246,.18) 0%, rgba(6,182,212,.06) 50%, transparent 70%)',
            pointerEvents:'none',
          }} />

          {/* SVG Visual */}
          <svg viewBox="0 0 340 480" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width:'100%', height:'100%', position:'absolute', inset:0 }}
          >
            <defs>
              <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity=".15" />
                <stop offset="60%" stopColor="#06B6D4" stopOpacity=".05" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="boxTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5BA4FF" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
              <linearGradient id="boxLeft" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#0C2A70" />
              </linearGradient>
              <linearGradient id="boxRight" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1037A0" />
                <stop offset="100%" stopColor="#071B52" />
              </linearGradient>
              <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity=".3" />
                <stop offset="100%" stopColor="#0C2A70" stopOpacity=".1" />
              </linearGradient>
              <filter id="cityBlur">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="boxShadow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Background orb */}
            <ellipse cx="185" cy="230" rx="145" ry="155" fill="url(#orbGrad)" />

            {/* Rotating dashed ring */}
            <circle cx="185" cy="230" r="135"
              stroke="rgba(59,130,246,.1)" strokeWidth="1" strokeDasharray="6 5"
              style={{ animation:'cod-ring 25s linear infinite', transformOrigin:'185px 230px' }}
            />
            <circle cx="185" cy="230" r="110"
              stroke="rgba(34,211,238,.07)" strokeWidth="1" strokeDasharray="3 8"
              style={{ animation:'cod-ring 18s linear reverse infinite', transformOrigin:'185px 230px' }}
            />

            {/* City network edges */}
            {EDGES.map(([a, b], i) => (
              <line key={i}
                x1={CITIES[a].cx} y1={CITIES[a].cy}
                x2={CITIES[b].cx} y2={CITIES[b].cy}
                stroke="rgba(96,165,250,.18)" strokeWidth="0.75"
              />
            ))}

            {/* Animated trail on one edge */}
            <line x1={CITIES[0].cx} y1={CITIES[0].cy} x2={CITIES[1].cx} y2={CITIES[1].cy}
              stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="20 280"
              style={{ animation:'cod-trail 3.5s ease-in-out infinite' }}
            />
            <line x1={CITIES[1].cx} y1={CITIES[1].cy} x2={CITIES[2].cx} y2={CITIES[2].cy}
              stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="20 280"
              style={{ animation:'cod-trail 3.5s ease-in-out 1.2s infinite' }}
            />

            {/* City dots */}
            {CITIES.map((c, i) => (
              <g key={i} filter="url(#cityBlur)">
                <circle cx={c.cx} cy={c.cy} r={c.r * 2.5}
                  fill="rgba(96,165,250,.12)"
                  style={{ animation:`cod-pulse 2.2s ease-in-out ${c.d} infinite` }}
                />
                <circle cx={c.cx} cy={c.cy} r={c.r}
                  fill="#60A5FA"
                  style={{ animation:`cod-pulse 2.2s ease-in-out ${c.d} infinite` }}
                />
              </g>
            ))}

            {/* 3D isometric delivery box — floating */}
            <g style={{ animation:'cod-float 3.5s ease-in-out infinite', transformOrigin:'185px 130px' }}>
              {/* Shadow beneath box */}
              <ellipse cx="185" cy="185" rx="52" ry="12" fill="rgba(0,0,0,.5)" />
              {/* Top face */}
              <polygon points="185,72 245,106 185,140 125,106" fill="url(#boxTop)" />
              {/* Left face */}
              <polygon points="125,106 185,140 185,185 125,151" fill="url(#boxLeft)" />
              {/* Right face */}
              <polygon points="245,106 185,140 185,185 245,151" fill="url(#boxRight)" />
              {/* Tape on top */}
              <polygon points="185,72 210,86 195,94 170,80" fill="rgba(147,210,255,.25)" />
              <polygon points="185,72 160,86 175,94 200,80" fill="rgba(147,210,255,.15)" />
              {/* RetraLabs text on right face */}
              <text x="205" y="168" fill="rgba(147,197,253,.5)" fontSize="8"
                fontFamily="-apple-system,sans-serif" fontWeight="700" letterSpacing="0.05em"
                transform="skewY(-30)" style={{ userSelect:'none' }}>
                RL
              </text>
              {/* Edge highlights */}
              <line x1="185" y1="72" x2="185" y2="140" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" />
              <line x1="185" y1="140" x2="185" y2="185" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
              <line x1="125" y1="106" x2="245" y2="106" stroke="rgba(255,255,255,.12)" strokeWidth="0.5" />
            </g>

            {/* Security shield — bottom right */}
            <g transform="translate(250, 310)" filter="url(#cityBlur)">
              {/* Outer glow */}
              <path d="M28,0 L56,14 L56,38 C56,56 42,70 28,76 C14,70 0,56 0,38 L0,14 Z"
                fill="rgba(59,130,246,.08)"
                style={{ animation:`cod-pulse 3s ease-in-out .5s infinite` }}
              />
              {/* Shield body */}
              <path d="M28,4 L52,16 L52,38 C52,54 40,66 28,72 C16,66 4,54 4,38 L4,16 Z"
                fill="url(#shieldGrad)"
                stroke="rgba(96,165,250,.4)" strokeWidth="1"
              />
              {/* Check */}
              <path d="M18,36 L24,43 L38,28"
                stroke="#60A5FA" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </g>

            {/* Delivery van — bottom */}
            <g transform="translate(40, 380)">
              {/* Motion trails */}
              <line x1="-5" y1="20" x2="-38" y2="20" stroke="rgba(59,130,246,.25)" strokeWidth="2" strokeLinecap="round" />
              <line x1="-5" y1="30" x2="-55" y2="30" stroke="rgba(59,130,246,.15)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="-5" y1="12" x2="-28" y2="12" stroke="rgba(59,130,246,.12)" strokeWidth="1" strokeLinecap="round" />
              {/* Van body */}
              <rect x="0" y="4" width="130" height="52" rx="4"
                fill="#0F2244" stroke="rgba(59,130,246,.35)" strokeWidth="1" />
              {/* Cab section */}
              <rect x="108" y="4" width="48" height="52" rx="4"
                fill="#112850" stroke="rgba(59,130,246,.35)" strokeWidth="1" />
              {/* Windshield */}
              <rect x="114" y="10" width="36" height="26" rx="3"
                fill="rgba(96,165,250,.15)" stroke="rgba(96,165,250,.2)" strokeWidth="0.5" />
              {/* Windshield tint */}
              <rect x="114" y="10" width="36" height="12" rx="3"
                fill="rgba(30,58,138,.4)" />
              {/* Side window */}
              <rect x="6" y="10" width="95" height="20" rx="2"
                fill="rgba(59,130,246,.06)" stroke="rgba(96,165,250,.15)" strokeWidth="0.5" />
              {/* Logo on side */}
              <text x="50" y="26" fill="rgba(96,165,250,.4)" fontSize="9"
                fontFamily="-apple-system,sans-serif" fontWeight="700" textAnchor="middle"
                letterSpacing="0.1em" style={{ userSelect:'none' }}>
                RETRALABS
              </text>
              {/* Bottom stripe */}
              <rect x="0" y="44" width="156" height="3" rx="1" fill="rgba(59,130,246,.25)" />
              {/* Wheels */}
              <circle cx="36" cy="58" r="14" fill="#071630" stroke="rgba(59,130,246,.4)" strokeWidth="1.5" />
              <circle cx="36" cy="58" r="7" fill="rgba(30,64,175,.3)" stroke="rgba(96,165,250,.3)" strokeWidth="1" />
              <circle cx="36" cy="58" r="3" fill="rgba(96,165,250,.5)" />
              <circle cx="128" cy="58" r="14" fill="#071630" stroke="rgba(59,130,246,.4)" strokeWidth="1.5" />
              <circle cx="128" cy="58" r="7" fill="rgba(30,64,175,.3)" stroke="rgba(96,165,250,.3)" strokeWidth="1" />
              <circle cx="128" cy="58" r="3" fill="rgba(96,165,250,.5)" />
              {/* Headlight */}
              <ellipse cx="157" cy="36" rx="5" ry="4"
                fill="rgba(186,230,253,.9)" filter="url(#cityBlur)" />
            </g>

            {/* Bottom tagline */}
            <text x="170" y="468" fill="rgba(96,165,250,.35)" fontSize="9"
              fontFamily="-apple-system,sans-serif" fontWeight="600" letterSpacing="0.18em"
              textAnchor="middle" style={{ userSelect:'none', textTransform:'uppercase' }}>
              FAST · DISCREET · RELIABLE
            </text>
          </svg>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position:'absolute', top:16, right:16, zIndex:10,
            width:32, height:32, borderRadius:'50%',
            background:'rgba(255,255,255,.07)',
            border:'1px solid rgba(255,255,255,.12)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'rgba(148,163,184,.8)',
            transition:'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.14)'; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.07)'; e.currentTarget.style.color='rgba(148,163,184,.8)'; }}
        >
          <X size={14} />
        </button>

        {/* Bottom trust bar */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          borderTop:'1px solid rgba(255,255,255,.05)',
          background:'rgba(0,0,0,.2)',
          backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          gap:24, padding:'10px 24px',
        }}>
          {['100% Authentic Products', '100% Safe Transactions', '100% Yours to Trust'].map((t, i) => (
            <span key={i} style={{
              display:'flex', alignItems:'center', gap:6,
              color:'rgba(148,163,184,.45)', fontSize:11, letterSpacing:'0.08em',
            }}>
              <span style={{ color:'rgba(96,165,250,.5)', fontSize:10 }}>🔒</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CodAnnouncementModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('cod_announce_shown')) {
      const t = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem('cod_announce_shown', '1');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!open) return null;
  return createPortal(<ModalContent onClose={() => setOpen(false)} />, document.body);
}
