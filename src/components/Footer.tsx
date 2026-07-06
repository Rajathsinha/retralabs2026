import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link as RouterLink } from 'react-router-dom';
import { Mail, ArrowUpRight, MessageCircle, ShieldCheck, Globe, FileCheck, FlaskConical, X, CheckCircle2, MapPin, Phone, Clock } from 'lucide-react';
import Logo from './Logo';
import TrustpilotWidget from './TrustpilotWidget';
import { WHATSAPP_NUMBER, BUSINESS_NAP } from '../constants/config';

const DISCLAIMER_ITEMS = [
  'These products are for research use only — not for personal consumption.',
  'RetraLabs does not provide medical advice or guidance of any kind.',
  'I will not request dosage information — no dosage guidance will be provided.',
] as const;

function WADisclaimerModal({ waUrl, onClose }: { waUrl: string; onClose: () => void }) {
  const [checks, setChecks] = useState([false, false, false]);
  const allChecked = checks.every(Boolean);
  const toggle = (i: number) => setChecks(prev => prev.map((v, j) => j === i ? !v : v));

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 28, maxWidth: 440, width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ color: '#f59e0b', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Before we chat
            </p>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
              Please confirm the following
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {DISCLAIMER_ITEMS.map((label, i) => (
            <button key={i} type="button" onClick={() => toggle(i)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: checks[i] ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${checks[i] ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.18s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                background: checks[i] ? '#10b981' : 'transparent',
                border: `2px solid ${checks[i] ? '#10b981' : '#475569'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s',
              }}>
                {checks[i] && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: checks[i] ? '#d1fae5' : '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <a
          href={allChecked ? waUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { if (!allChecked) e.preventDefault(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '13px', borderRadius: 12,
            background: allChecked ? '#25D366' : '#1e293b',
            color: allChecked ? '#fff' : '#475569',
            fontWeight: 800, fontSize: 15, textDecoration: 'none',
            cursor: allChecked ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          <MessageCircle size={18} />
          {allChecked ? 'Open WhatsApp' : 'Tick all boxes to continue'}
        </a>
      </div>
    </div>,
    document.body
  );
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'COA Verified', iconColor: 'text-emerald-400', badgeClass: 'border-emerald-800/50 text-emerald-300' },
  { icon: Globe,       label: 'GMP Sourced',  iconColor: 'text-amber-400',   badgeClass: 'border-amber-800/50 text-amber-300'   },
  { icon: FileCheck,   label: 'HPLC Tested',  iconColor: 'text-blue-400',    badgeClass: 'border-blue-800/50 text-blue-300'     },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/support', label: 'Support' },
  { to: '/catalogue', label: 'Products' },
];

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/refund', label: 'Refund Policy' },
];

const WA_DEFAULT = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I have a question about RetraLabs products.')}`;

function FooterLink({ href, children, external = false }: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    'text-sm text-slate-500 hover:text-white transition-colors duration-200 flex items-center gap-1 group';

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
      </a>
    );
  }

  return (
    <RouterLink to={href} className={cls}>
      {children}
      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
    </RouterLink>
  );
}

export default function Footer() {
  const [showWAModal, setShowWAModal] = useState(false);
  return (
    <>
    <footer className="bg-slate-950 text-slate-400 mt-auto">

      {/* Trust Badges Bar */}
      <div className="border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <span
                  key={badge.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border ${badge.badgeClass} text-xs font-medium`}
                >
                  <Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                  {badge.label}
                </span>
              );
            })}

            {/* Trustpilot star badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <TrustpilotWidget
                template="microCombo"
                height="20px"
                width="140px"
                theme="dark"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 mb-12">

          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="mb-5">
              <Logo size="sm" variant="light" />
            </div>
            <p className="text-sm leading-relaxed mb-5 text-slate-500">
              India's trusted research peptide supplier. HPLC-verified, COA-backed compounds sourced
              directly from GMP-certified manufacturers.
            </p>

            {/* NAP - Name, Address, Phone */}
            <div className="space-y-2.5 mb-5" itemScope itemType="https://schema.org/LocalBusiness">
              <meta itemProp="name" content={BUSINESS_NAP.name} />
              <meta itemProp="url" content={BUSINESS_NAP.url} />
              <div className="flex items-start gap-2 text-sm text-slate-500" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-600" />
                <span>
                  <span itemProp="addressLocality">{BUSINESS_NAP.address.city}</span>, <span itemProp="addressRegion">{BUSINESS_NAP.address.state}</span> <span itemProp="postalCode">{BUSINESS_NAP.address.postalCode}</span>, <span itemProp="addressCountry">India</span>
                </span>
              </div>
              <a href={`tel:${BUSINESS_NAP.phoneRaw}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors" itemProp="telephone">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" />
                {BUSINESS_NAP.phone}
              </a>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" />
                <span>{BUSINESS_NAP.hours.display}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="mailto:support@retralabs.in"
                className="inline-flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300 transition-colors"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                support@retralabs.in
              </a>
              <button
                type="button"
                onClick={() => setShowWAModal(true)}
                className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                WhatsApp Support
              </button>
            </div>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterLink href={link.to}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">
              Legal
            </h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterLink href={link.to}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Peptides Column — keyword-anchored internal links */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">
              Popular Peptides
            </h4>
            <ul className="space-y-3">
              <li><FooterLink href="/product/1">Buy Retatrutide India</FooterLink></li>
              <li><FooterLink href="/product/2">Buy Tirzepatide India</FooterLink></li>
              <li><FooterLink href="/product/3">Buy GHK-Cu India</FooterLink></li>
              <li><FooterLink href="/product/7">Buy BPC-157 India</FooterLink></li>
              <li><FooterLink href="/product/4">Buy Semax India</FooterLink></li>
              <li><FooterLink href="/catalogue">All Research Peptides</FooterLink></li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink href="/support">Support</FooterLink>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowWAModal(true)}
                  className="text-sm text-slate-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  WhatsApp Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-slate-800/50 mb-8" />

        {/* Bottom Bar */}
        <div className="pr-20 md:pr-24">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>&copy; {new Date().getFullYear()} RetraLabs. All rights reserved.</p>
            <p className="text-center md:text-right">
              Research Use Disclaimer: All products are for laboratory research purposes only. Not for human use.
            </p>
          </div>
        </div>
      </div>
    </footer>
    {showWAModal && (
      <WADisclaimerModal waUrl={WA_DEFAULT} onClose={() => setShowWAModal(false)} />
    )}
    </>
  );
}
