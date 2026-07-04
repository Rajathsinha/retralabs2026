import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionItem,
  Card,
  CardBody,
  Chip,
  Divider,
} from '@heroui/react';
import {
  Mail,
  MessageSquare,
  Clock,
  Package,
  Thermometer,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';

const FAQS = [
  {
    question: 'What are the shipping timelines?',
    answer:
      'Orders are typically processed within 1-2 business days. Shipping times vary by location: 3-5 business days for metro cities, 5-7 business days for other locations. You will receive tracking information once your order ships.',
  },
  {
    question: 'How should I store these peptides?',
    answer:
      'All peptides should be stored at -20°C or below immediately upon receipt. Once reconstituted, store at 2-8°C and use within the timeframe specified in the product documentation. Avoid repeated freeze-thaw cycles.',
  },
  {
    question: 'Are these products approved for human use?',
    answer:
      'No. All products are strictly for in vitro research and analytical purposes only. They are not approved for human consumption, therapeutic use, or veterinary applications. Purchasers must comply with all applicable regulations.',
  },
  {
    question: 'What documentation is provided with each order?',
    answer:
      'Each order includes a Certificate of Analysis (CoA) showing purity testing results, batch number, storage instructions, and reconstitution guidelines. Additional technical documentation is available upon request.',
  },
  {
    question: 'What is your return policy?',
    answer:
      'Due to the nature of these products and storage requirements, we cannot accept returns once shipped. However, if you receive damaged products or incorrect items, please contact us within 48 hours with photographic evidence.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Currently, we only ship within India. International shipping may be available in the future subject to regulatory compliance.',
  },
];

const SUPPORT_CHANNELS = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Support',
    desc: 'Real-time assistance for urgent queries.',
    chip: { label: '1hr SLA · 9AM–6PM', color: 'success' as const },
    href: 'https://wa.me/918217824384?text=Hello%2C%20I%20need%20support%20with%20RetraLabs',
    btnLabel: 'Chat on WhatsApp',
    btnColor: 'success' as const,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Mail,
    title: 'Email Support',
    desc: 'For detailed inquiries or documentation requests.',
    chip: { label: 'Responds in 24hrs', color: 'primary' as const },
    href: 'mailto:support@retralabs.in',
    btnLabel: 'Send Email',
    btnColor: 'primary' as const,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: Package,
    title: 'Order Status',
    desc: 'Track your order or inquire about delivery.',
    chip: { label: 'Email with order number', color: 'default' as const },
    href: 'mailto:support@retralabs.in?subject=Order%20Status%20Inquiry',
    btnLabel: 'Inquire About Order',
    btnColor: 'default' as const,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    icon: Thermometer,
    title: 'Technical Support',
    desc: 'Questions about storage, handling, or protocols.',
    chip: { label: 'Scientific team', color: 'secondary' as const },
    href: 'mailto:support@retralabs.in?subject=Technical%20Support%20Request',
    btnLabel: 'Ask Our Scientists',
    btnColor: 'secondary' as const,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
];

const REFERRAL_SOURCES = ['YouTube', 'Instagram', 'Reddit', 'Friend', 'Google', 'Twitter / X', 'TikTok', 'IndiaMART'];

export default function SupportPage() {
  const navigate = useNavigate();

  const [referralSource, setReferralSource] = useState('');
  const [friendName, setFriendName] = useState('');
  const [showReferralError, setShowReferralError] = useState(false);

  const buildWhatsAppUrl = () => {
    const referralLine = referralSource
      ? `%0A%0AFound you via: ${encodeURIComponent(referralSource)}${referralSource === 'Friend' && friendName ? ` (referred by ${encodeURIComponent(friendName)})` : ''}`
      : '';
    return `https://wa.me/918217824384?text=Hello%2C%20I%20need%20support%20with%20RetraLabs${referralLine}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!referralSource) {
      e.preventDefault();
      setShowReferralError(true);
      document.getElementById('support-referral-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero heading */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <Chip color="primary" variant="flat" size="sm">Support Centre</Chip>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">We're Here. Actually.</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Real humans. Fast replies. No bots pretending to care. Check the FAQs first — they're good — or just message us directly.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Support channel cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {SUPPORT_CHANNELS.map((channel) => (
            <Card
              key={channel.title}
              shadow="none"
              className="border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <CardBody className="p-5 flex flex-col gap-3">
                <div className={`w-11 h-11 ${channel.iconBg} rounded-xl flex items-center justify-center`}>
                  <channel.icon className={`w-5 h-5 ${channel.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{channel.title}</h3>
                  <p className="text-sm text-slate-500 mb-2">{channel.desc}</p>
                  <Chip size="sm" color={channel.chip.color} variant="flat">
                    {channel.chip.label}
                  </Chip>
                </div>
                <a
                  href={channel.href}
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                  rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`w-full text-center text-sm font-medium py-2 px-3 rounded-xl transition-colors ${
                    channel.btnColor === 'success'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : channel.btnColor === 'primary'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : channel.btnColor === 'secondary'
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={{ textDecoration: 'none' }}
                >
                  {channel.btnLabel}
                </a>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <p className="text-sm text-slate-500">
            WhatsApp hours: Monday – Saturday, 9:00 AM – 6:00 PM IST. Email is monitored on all business days.
          </p>
        </div>

        <Divider className="mb-12" />

        {/* FAQ section */}
        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The Questions Everyone Has.</h2>
          <p className="text-slate-500 mb-8">
            Shipping, storage, documentation, purity, payments — it's all here. Probably.
          </p>

          <Accordion
            selectionMode="multiple"
            variant="splitted"
            className="px-0"
          >
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                aria-label={faq.question}
                title={
                  <span className="font-semibold text-slate-900 text-base">{faq.question}</span>
                }
                classNames={{
                  base: 'border border-slate-200 shadow-none rounded-xl',
                  content: 'text-slate-600 leading-relaxed pb-4',
                }}
              >
                {faq.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <Divider className="my-12" />

        {/* Research disclaimer */}
        <Card shadow="none" className="border border-amber-200 bg-amber-50 max-w-4xl">
          <CardBody className="flex flex-row items-start gap-4 p-6">
            <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Research Use Disclaimer</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                All products sold by RetraLabs are intended solely for in vitro research and
                analytical purposes. These materials are not approved for human or animal
                consumption, therapeutic applications, or any clinical use. Purchasers must be
                affiliated with recognized research institutions or laboratories and must comply
                with all applicable local, state, and federal regulations. By purchasing these
                products, you acknowledge that you are a qualified research professional and will
                use these materials in accordance with proper laboratory safety protocols.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Contact CTA with mandatory referral */}
        <div className="mt-12 max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
            <p className="text-slate-500">
              Our team is happy to help — reach out via WhatsApp for a quick response.
            </p>
            <p className="text-xs text-rose-600 font-semibold mt-1">
              ⚠ No dosage or guidance provided. Strictly for research use only.
            </p>
          </div>

          {/* How did you find us — mandatory */}
          <div id="support-referral-section" className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              How did you find us? <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">Required before contacting us</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {REFERRAL_SOURCES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setReferralSource(src);
                    setShowReferralError(false);
                    if (src !== 'Friend') setFriendName('');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                    referralSource === src
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
            {referralSource === 'Friend' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Friend's name (may qualify for an extra discount 🎉)"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
                />
              </div>
            )}
            {showReferralError && (
              <p className="text-xs text-red-500 mt-1.5">Please select how you found us to continue.</p>
            )}
          </div>

          {/* WhatsApp CTA */}
          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold py-4 px-6 rounded-2xl transition-colors text-base shadow-lg shadow-green-500/20"
            style={{ textDecoration: 'none' }}
          >
            <MessageSquare className="w-5 h-5" />
            WhatsApp Us
          </a>

          <div className="flex justify-center mt-3">
            <button
              onClick={() => navigate('/contact')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
            >
              <Mail className="w-4 h-4" />
              Or use the Contact Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
