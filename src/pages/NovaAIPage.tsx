import { useEffect, useRef, useState } from 'react';
import { Hexagon, ChevronRight } from 'lucide-react';

// ─── Scroll-scrubbed video background ─────────────────────────────────────────
function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const framesCacheRef = useRef<ImageBitmap[]>([]);
  const isReadyRef = useRef(false);
  const smoothProgressRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poster = posterRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas DPR
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    let animationId: number;
    let videoDuration = 0;

    // Extract frames for smooth scrubbing
    const extractFrames = async () => {
      if (!isReadyRef.current) return;

      const offscreenVideo = document.createElement('video');
      offscreenVideo.src = video.src;
      offscreenVideo.muted = true;
      offscreenVideo.playsInline = true;

      await new Promise((resolve) => {
        offscreenVideo.onloadedmetadata = resolve;
      });

      videoDuration = offscreenVideo.duration;
      const numFrames = Math.min(Math.ceil(videoDuration * 12), 90);

      for (let i = 0; i < numFrames; i++) {
        offscreenVideo.currentTime = (i / numFrames) * videoDuration;
        await new Promise((resolve) => {
          offscreenVideo.onseeked = resolve;
        });

        const canvas2d = document.createElement('canvas');
        canvas2d.width = 960;
        canvas2d.height = 540;
        const ctx2d = canvas2d.getContext('2d');
        if (ctx2d) {
          ctx2d.drawImage(offscreenVideo, 0, 0, 960, 540);
          framesCacheRef.current.push(
            await createImageBitmap(canvas2d)
          );
        }
      }
    };

    // Handle video loaded
    const handleLoadedData = async () => {
      if (poster) {
        poster.style.transition = 'opacity 500ms ease-out';
        poster.style.opacity = '0';
      }
      video.style.transition = 'opacity 500ms ease-out';
      video.style.opacity = '0';

      isReadyRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await extractFrames();

      canvas.style.transition = 'opacity 500ms ease-out';
      canvas.style.opacity = '1';
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.src =
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4';

    // Scroll handler
    const handleScroll = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollHeight > 0 ? window.scrollY / scrollHeight : 0, 1);
      smoothProgressRef.current +=
        (progress - smoothProgressRef.current) * 0.12;
    };

    // Animation loop
    const animate = () => {
      if (framesCacheRef.current.length > 0 && ctx) {
        const frameIndex = Math.floor(
          smoothProgressRef.current * (framesCacheRef.current.length - 1)
        );
        const frame = framesCacheRef.current[frameIndex];

        // Draw with object-cover scaling
        const canvasW = canvas.width / dpr;
        const canvasH = canvas.height / dpr;
        const videoW = 960;
        const videoH = 540;

        const scale = Math.max(canvasW / videoW, canvasH / videoH);
        const scaledW = videoW * scale;
        const scaledH = videoH * scale;
        const offsetX = (canvasW - scaledW) / 2;
        const offsetY = (canvasH - scaledH) / 2;

        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(frame, offsetX, offsetY, scaledW, scaledH);
      } else if (video && video.currentTime !== undefined && ctx && isReadyRef.current) {
        // Fallback: seek video
        const seekTime = Math.max(0, smoothProgressRef.current * (videoDuration - 0.05));
        if (Math.abs(video.currentTime - seekTime) > 0.04) {
          video.currentTime = seekTime;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll);
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationId);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0a0a]"
    >
      <img
        ref={posterRef}
        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudflare.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.jpg&w=1920&q=85"
        alt="hero poster"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-0"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-0"
      />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b border-white/15 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="px-5 sm:px-8 md:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 text-lg sm:text-xl font-medium tracking-tight text-white transform transition-all duration-700 ease-out translate-y-0 opacity-100"
        >
          <Hexagon size={24} strokeWidth={1.5} />
          <span>novaai</span>
        </div>

        {/* Center links (hidden below md) */}
        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          {['Projects', 'About', 'Blog', 'Contact'].map((link, i) => (
            <a
              key={link}
              href="#"
              className="text-sm text-white/85 hover:text-white transition-colors duration-300 transform translate-y-0 opacity-100"
              style={{
                transitionDelay: `${100 + i * 100}ms`,
              }}
            >
              {link === 'Projects' ? (
                <span className="flex items-baseline gap-1">
                  Projects
                  <span className="font-mono text-[10px] text-white/60">6</span>
                </span>
              ) : (
                link
              )}
            </a>
          ))}
        </div>

        {/* CTA */}
        <button
          className="rounded-md border border-white/20 bg-white/15 backdrop-blur-md px-4 py-2 sm:px-5 sm:text-sm text-xs text-white hover:bg-white/25 transition-all duration-300 transform translate-y-0 opacity-100"
          style={{
            transitionDelay: '500ms',
          }}
        >
          Get Free Consultation
        </button>
      </div>
    </nav>
  );
}

// ─── Reveal animation component ───────────────────────────────────────────────
function RevealText({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } will-change-transform ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Section One (Hero) ───────────────────────────────────────────────────────
function SectionOne() {
  return (
    <section className="relative z-10 min-h-screen supports-[height:100svh]:min-h-[100svh] flex flex-col justify-between pt-24 sm:pt-28 px-5 sm:px-8 md:px-12 pb-12 md:pb-16">
      {/* Top row */}
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        {/* Left - service list */}
        <div className="flex flex-col gap-2">
          {[
            '/ AI AUTOMATION',
            '/ AI INTEGRATION',
            '/ AI AGENT DEVELOPMENT',
          ].map((service, i) => (
            <RevealText
              key={service}
              delay={150 + i * 120}
              className="font-mono text-xs uppercase tracking-[0.15em] text-white/90 drop-shadow-md"
            >
              {service}
            </RevealText>
          ))}
        </div>

        {/* Right - intro */}
        <RevealText
          delay={300}
          className="max-w-xs sm:text-right text-lg sm:text-xl leading-relaxed text-white drop-shadow-md"
        >
          We design automation that brings clarity, precision, and efficiency to
          the way your company operates.
        </RevealText>
      </div>

      {/* Bottom row */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        {/* Left */}
        <div>
          {/* Badge */}
          <RevealText
            delay={150}
            className="border-l-2 border-white bg-white/15 px-3 py-1.5 backdrop-blur-md mb-5 w-fit"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white">
              We Automate 100+ Businesses
            </span>
          </RevealText>

          {/* H1 */}
          <RevealText
            delay={280}
            className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg"
          >
            Clear. Precise.
            <br />
            Automated.
          </RevealText>
        </div>

        {/* Right - glass contact card */}
        <RevealText delay={420} className="w-full max-w-sm">
          <div className="flex items-center gap-4 rounded-xl bg-white/15 p-3 backdrop-blur-md border border-white/15">
            <img
              src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudflare.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260728_050334_5b076e26-0ce7-4898-b432-d764190e448f.png&w=1280&q=85"
              alt="Mitha, co-founder of NovaAI"
              className="h-24 w-20 rounded-lg object-cover"
            />
            <div className="gap-1.5 pr-2 flex flex-col">
              <p className="text-sm font-medium text-white">Talk with Mitha</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                Co-founder of NovaAI
              </p>
              <button className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/85 transition-colors duration-300 mt-1.5 flex items-center gap-2 w-fit">
                Book 15-mins call
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </RevealText>
      </div>
    </section>
  );
}

// ─── Mid spacer ───────────────────────────────────────────────────────────────
function MidSpacer() {
  return <div className="relative z-10 h-[80vh]" aria-hidden />;
}

// ─── Section Two (Capability) ─────────────────────────────────────────────────
function SectionTwo() {
  return (
    <section className="relative z-10 min-h-screen supports-[height:100svh]:min-h-[100svh] flex flex-col justify-between pt-24 sm:pt-28 px-5 sm:px-8 md:px-12 pb-12 md:pb-16">
      {/* Top row */}
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between sm:items-start">
        {/* Left badge */}
        <RevealText
          delay={120}
          className="border-l-2 border-white bg-white/15 px-3 py-1.5 backdrop-blur-md w-fit"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white">
            Insight On Demand
          </span>
        </RevealText>

        {/* Right copy */}
        <RevealText
          delay={220}
          className="max-w-sm sm:text-right text-lg sm:text-xl leading-relaxed text-white drop-shadow-md"
        >
          Our AI doesn't just respond — it interprets, sharpens, and delivers the
          signal you need.
        </RevealText>
      </div>

      {/* Bottom area */}
      <div className="flex flex-1 justify-end flex-col gap-12 md:flex-row md:items-end md:justify-between md:gap-16">
        {/* Left column */}
        <div className="max-w-xl">
          {/* H2 */}
          <RevealText
            delay={180}
            className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg"
          >
            Learn to see
            <br />
            brilliantly.
          </RevealText>

          {/* Body */}
          <RevealText
            delay={320}
            className="mt-6 max-w-md text-sm sm:text-base text-white/80 drop-shadow-md"
          >
            From the first sketch to the final render, Nova turns raw intent into
            decisions your team can act on — quietly, precisely, at speed.
          </RevealText>

          {/* CTAs */}
          <RevealText delay={420} className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-medium text-black hover:bg-white/85 transition-colors duration-300 flex items-center gap-2">
              Run the demo
              <ChevronRight size={14} />
            </button>
            <button className="rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-5 py-2.5 text-xs sm:text-sm text-white hover:bg-white/20 transition-colors duration-300">
              Free consultation
            </button>
          </RevealText>
        </div>

        {/* Right - capability panel */}
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-5 sm:px-6">
          {[
            {
              index: '01',
              title: 'Real-time vision',
              body: 'Reads context as it happens and surfaces what matters before you ask.',
            },
            {
              index: '02',
              title: 'Layered insight',
              body: 'Moves from rough outline to sharp output without losing the thread.',
            },
            {
              index: '03',
              title: 'Adaptive speed',
              body: 'Learns your cadence and tightens every pass as you work.',
            },
          ].map((item, i) => (
            <RevealText
              key={item.index}
              delay={300 + i * 110}
              className={`flex gap-5 py-5 ${
                i < 2 ? 'border-b border-white/15' : ''
              }`}
            >
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] tracking-[0.15em] text-white/55">
                    {item.index}
                  </span>
                  <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                    {item.title}
                    <ChevronRight
                      size={16}
                      className="text-white/40 hover:text-white transition-colors duration-300"
                    />
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-white/70">
                  {item.body}
                </p>
              </div>
            </RevealText>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NovaAIPage() {
  return (
    <div className="relative bg-[#0a0a0a] text-white overflow-x-hidden">
      <ScrollVideo />
      <Navbar />

      <main className="relative z-10">
        <SectionOne />
        <MidSpacer />
        <SectionTwo />
      </main>
    </div>
  );
}
