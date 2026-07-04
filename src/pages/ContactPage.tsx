import { useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Textarea,
} from '@heroui/react';
import { Mail, MessageSquare, Clock, AlertTriangle, Send } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { getLocalBusinessSchema, getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { BUSINESS_NAP } from '../constants/config';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailtoUrl = `mailto:support@retralabs.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');

    setTimeout(() => {
      setIsSending(false);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1000);
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
            <Card key={method.title} shadow="none" className="border border-slate-200 hover:border-slate-300 transition-colors">
              <CardBody className="p-5">
                <div className={`w-11 h-11 ${method.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <method.icon className={`w-5 h-5 ${method.iconClass}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{method.title}</h3>
                <p className="text-sm text-slate-500 mb-3">{method.desc}</p>
                <Chip size="sm" color={method.chip.color} variant="flat" className="mb-3">
                  {method.chip.label}
                </Chip>
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
              </CardBody>
            </Card>
          ))}
        </div>

        <Divider className="mb-12" />

        {/* Contact form */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Send Us a Message.</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Fill in the form and we'll get back to you ASAP. For anything urgent, just WhatsApp us — it's faster and we're actually on it.
            </p>

            {/* Important notice */}
            <Card shadow="none" className="border border-amber-200 bg-amber-50">
              <CardBody className="flex flex-row items-start gap-3 p-4">
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
              </CardBody>
            </Card>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name"
              placeholder="Full name"
              variant="bordered"
              isRequired
              value={name}
              onValueChange={setName}
            />
            <Input
              label="Email Address"
              placeholder="you@email.com"
              type="email"
              variant="bordered"
              isRequired
              value={email}
              onValueChange={setEmail}
            />
            <Input
              label="Subject"
              placeholder="How can we help?"
              variant="bordered"
              isRequired
              value={subject}
              onValueChange={setSubject}
            />
            <Textarea
              label="Message"
              placeholder="Describe your inquiry in detail..."
              variant="bordered"
              minRows={5}
              isRequired
              value={message}
              onValueChange={setMessage}
            />
            <Button
              type="submit"
              color="primary"
              size="lg"
              fullWidth
              isLoading={isSending}
              startContent={!isSending && <Send className="w-4 h-4" />}
              className="font-semibold"
            >
              {isSending ? 'Opening email client...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
