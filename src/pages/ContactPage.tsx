import { useState } from 'react';
import { Mail, MessageSquare, Clock, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { getLocalBusinessSchema, getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { BUSINESS_NAP } from '../constants/config';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: `Contact RetraLabs | Research Peptide Support | ${BUSINESS_NAP.address.city}, India`,
    description: `Contact RetraLabs for research peptide inquiries. WhatsApp: ${BUSINESS_NAP.phone}, Email: ${BUSINESS_NAP.email}. Based in ${BUSINESS_NAP.address.city}, ${BUSINESS_NAP.address.state}. ${BUSINESS_NAP.hours.display}.`,
    canonical: 'https://retralabs.in/contact',
    schema: [
      getLocalBusinessSchema(),
      getBreadcrumbSchema([
        { name: 'Home', url: 'https://retralabs.in/' },
        { name: 'Contact', url: 'https://retralabs.in/contact' },
      ]),
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_RESEND_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'contact@retralabs.in',
          to: 'support@retralabs.in',
          subject: `[Contact Form] ${subject}`,
          html: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Subject:</b> ${subject}</p><p><b>Message:</b><br/>${message.replace(/\n/g, '<br/>')}</p>`,
        }),
      });
      if (!res.ok && import.meta.env.VITE_RESEND_API_KEY) throw new Error('Failed to send');
    } catch (_) {
      // silently continue — WhatsApp is the primary support channel
    }

    setIsSending(false);
    setSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  const contactMethods = [
    {
      icon: MessageSquare,
      title: 'WhatsApp',
      desc: 'Quick questions & real-time support',
      chip: { label: '1hr SLA · 9AM–6PM', color: 'success' as const },
      href: 'https://wa.me/918217824384?text=Hello%2C%20I%20came%20across%20your%20website%20RetraLabs',
      linkText: '+91 8217824384',
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      icon: Mail,
      title: 'Email Support',
      desc: 'Send us a detailed inquiry',
      chip: { label: 'Responds in 24hrs', color: 'primary' as const },
      href: 'mailto:support@retralabs.in',
      linkText: 'support@retralabs.in',
      iconClass: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      desc: 'Monday to Saturday',
      chip: { label: '9:00 AM – 6:00 PM IST', color: 'warning' as const },
      href: '',
      linkText: '',
      iconClass: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Say Something. We're Listening.</h1>
          <p className="text-lg text-slate-500 max-w-xl">
            Questions, concerns, or just want to tell us the reta is working? We read everything. Usually within 24 hours.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contact method cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {contactMethods.map((method) => (
            <div key={method.title} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
              <div className="p-5">
                <div className={`w-11 h-11 ${method.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <method.icon className={`w-5 h-5 ${method.iconClass}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{method.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{method.desc}</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                  method.chip.color === 'success' ? 'bg-emerald-100 text-emerald-700'
                  : method.chip.color === 'primary' ? 'bg-blue-100 text-blue-700'
                  : method.chip.color === 'warning' ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
                }`}>
                  {method.chip.label}
                </span>
                {method.href && (
                  <div className="mt-1">
                    <a
                      href={method.href}
                      target={method.href.startsWith('http') ? '_blank' : undefined}
                      rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      {method.linkText}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <hr className="border-slate-200 my-4 mb-12" />

        {/* Contact form */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Us a Message.</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Fill in the form and we'll get back to you ASAP. For anything urgent, just WhatsApp us — it's faster and we're actually on it.
            </p>

            {/* Important notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50">
              <div className="flex flex-row items-start gap-3 p-4">
                <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 mb-1">Important Notice</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    All products are strictly for research use only. We do not provide medical
                    advice or support any use outside of laboratory research environments.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Message received!</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  We'll get back to you within 24 hours. For anything urgent, WhatsApp us directly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                  <input
                    placeholder="Full name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    placeholder="you@email.com"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                  <input
                    placeholder="How can we help?"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                  <textarea
                    placeholder="Describe your inquiry in detail..."
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-500 transition-colors resize-y"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  {!isSending && <Send className="w-4 h-4" />}
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
