import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Avatar,
  Chip,
  Divider,
} from '@heroui/react';
import { ExternalLink, Star, ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const communityReviews = [
  {
    username: 'u/Frosty-Ad-9691',
    initial: 'F',
    gradient: 'from-blue-500 to-cyan-500',
    time: '9 hours ago',
    title: 'First order experience with RetraLabs',
    body: "Not gonna lie, I've seen really mindblowing progress on mine. Dropped tons of fat and my health feels much much more under control now. My sugar levels are way better compared to earlier reports. Friends noticed the change and one of them jumped on it too — he's already seeing fat loss. Parents are also doing well till now. I am not at all affiliated with retralabs. RetraLabs peps are really genuine.",
    product: 'Retatrutide',
  },
  {
    username: 'u/Verified_Researcher_IN',
    initial: 'V',
    gradient: 'from-rose-500 to-pink-500',
    time: '1 day ago',
    title: "Retralabs is totally vibin — pure Retatrutide without burning a hole in your pocket",
    body: "My first order landed in just 9 days, but the second one took a chill 22 days. No biggie — I had enough stock to keep me going. Within just 3 hours I felt the reta's magic. I had tried some random online seller's reta — total fake, useless piece of junk. I was desperate for the real stuff and RetraLabs totally came through.",
    product: 'Retatrutide',
  },
  {
    username: 'u/Affectionate_Fox_313',
    initial: 'A',
    gradient: 'from-emerald-500 to-teal-500',
    time: '1 day ago',
    title: 'My Retatrutide order from retralabs.in (India)',
    body: "Posting this because I know how sketchy this space is, especially in India. Honestly, I was very skeptical at first. I had already been scammed earlier by a fake online seller (fake Peptide Sciences vials, wasted ~7k), so trusting anyone again wasn't easy. I checked proof of purchase and results from another user, then directly contacted the retralabs number listed on their site. Quality is absolutely legit.",
    product: 'Retatrutide',
  },
];

function CommunityReviewCard({ review }: { review: typeof communityReviews[0] }) {
  return (
    <Card shadow="sm" className="border border-slate-200 hover:border-slate-300 transition-all duration-300">
      <CardBody className="p-6">
        <div className="flex items-start gap-4">
          <Avatar
            name={review.initial}
            classNames={{
              base: `bg-gradient-to-br ${review.gradient} flex-shrink-0`,
              name: 'text-white font-bold text-base',
            }}
            size="md"
            radius="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="font-bold text-slate-900">{review.username}</h3>
              <span className="text-xs text-slate-400 flex-shrink-0">{review.time}</span>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              {review.product && (
                <Chip
                  size="sm"
                  variant="flat"
                  classNames={{
                    base: 'bg-teal-50 border border-teal-200',
                    content: 'text-teal-700 font-semibold text-xs',
                  }}
                >
                  {review.product}
                </Chip>
              )}
            </div>
            <h4 className="font-semibold text-slate-800 mb-2 text-[15px]">{review.title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed">{review.body}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-slate-950 py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-dot-pattern bg-dot-sm opacity-[0.04]" />
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-4 py-2 bg-white/5 text-accent-300 text-xs font-bold rounded-full uppercase tracking-wider border border-white/10 mb-6">
            Verified Reviews
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Don't Take<br />
            <span className="text-gradient">Our Word For It.</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg mb-10">
            Real posts from real researchers. We didn't write these. We just showed up with quality product.
          </p>
        </div>
      </section>

      {/* ─── TRUSTPILOT CTA BAR ─── */}
      <section className="bg-white border-b border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              as="a"
              href="https://www.trustpilot.com/review/retralabs.in"
              target="_blank"
              rel="noopener noreferrer"
              color="success"
              variant="solid"
              className="font-bold text-white"
              startContent={<ShieldCheck size={16} />}
              endContent={<ExternalLink size={14} />}
            >
              Review Us on Trustpilot
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ─── LIVE TRUSTPILOT SECTION ─── */}
        <div className="mb-16">
          <ScrollReveal>
            <Card shadow="none" className="border border-slate-100 mb-0" radius="lg">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <ShieldCheck size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Live Trustpilot Reviews</h2>
                      <p className="text-sm text-slate-500">Pulled live from Trustpilot. We can't edit these. Which is fine, because they're good.</p>
                    </div>
                  </div>
                  <a
                    href="https://www.trustpilot.com/review/retralabs.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                  >
                    View all on Trustpilot
                    <ArrowRight size={14} />
                  </a>
                </div>
              </CardHeader>
              <Divider />
              <CardBody className="px-6 py-6">
                <TrustpilotWidget
                  templateId={TRUSTPILOT_TEMPLATES.slider}
                  height="500px"
                  theme="light"
                />
              </CardBody>
            </Card>
          </ScrollReveal>
        </div>

        {/* ─── COMMUNITY REVIEWS SECTION ─── */}
        <div>
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <MessageCircle size={20} className="text-slate-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">What Researchers Are Saying</h2>
                <p className="text-sm text-slate-500">Unfiltered. Unsponsored. Unsolicited.</p>
              </div>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {communityReviews.map((review, i) => (
              <ScrollReveal key={review.username} delay={i * 100}>
                <CommunityReviewCard review={review} />
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ─── WRITE A REVIEW CTA ─── */}
        <ScrollReveal>
          <Card
            shadow="none"
            className="mt-16 bg-gradient-to-br from-slate-900 to-slate-800 border-0 overflow-hidden"
            radius="lg"
          >
            <CardBody className="relative p-10 text-center">
              <div className="absolute inset-0 bg-dot-pattern bg-dot-sm opacity-[0.03]" />
              <div className="relative">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-2xl font-bold text-white mb-3">Loved It? Tell the Internet.</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Your honest review helps other researchers dodge the scam market and find the real stuff. 2 minutes. Priceless for someone currently being ripped off by fake sellers.
                </p>
                <Button
                  as="a"
                  href="https://www.trustpilot.com/review/retralabs.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="success"
                  variant="solid"
                  className="font-bold text-white"
                  startContent={<ShieldCheck size={16} />}
                >
                  Review on Trustpilot
                </Button>
              </div>
            </CardBody>
          </Card>
        </ScrollReveal>
      </section>
    </div>
  );
}
