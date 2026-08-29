import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { GUIDES } from '../data/seoData';
import { ChevronRight, FlaskConical, ArrowRight } from 'lucide-react';

export default function GuidesIndexPage() {
  useSEO({
    title: 'Research Peptide Guides India — Peptide Storage, HPLC Testing, Purity | RetraLabs',
    description: 'Educational guides on research peptides: what they are, storage and handling, HPLC purity testing, COA interpretation, and compound-specific research overviews. By RetraLabs.',
    canonical: 'https://retralabs.in/guides',
    keywords: 'research peptide guides india, peptide storage guide, hplc testing guide, what are research peptides, retatrutide research, ghk-cu research, bpc-157 research',
    schema: getBreadcrumbSchema([
      { name: 'Home', url: 'https://retralabs.in/' },
      { name: 'Guides', url: 'https://retralabs.in/guides' },
    ]),
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-[#F0F0F0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5">
          <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
            <Link to="/" className="hover:text-[#374151] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium">Guides</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-blue-600" />
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Research Guides</span>
          </div>
          <h1 className="text-[#111111] text-[32px] sm:text-[42px] font-bold tracking-[-0.02em] leading-tight mb-4">
            Research Peptide Guides
          </h1>
          <p className="text-[#6B7280] text-[16px] leading-[1.8] max-w-[680px]">
            Educational resources for researchers in India — covering peptide fundamentals, storage and handling, analytical testing, and compound-specific research overviews. All content is for laboratory research purposes only.
          </p>
        </div>
      </div>

      {/* Guide cards */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GUIDES.map(guide => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className="group bg-white border border-[#E5E7EB] rounded-[16px] p-7 hover:border-[#D0D0D0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all"
            >
              <h2 className="text-[#111111] text-[18px] font-bold mb-2 group-hover:text-[#2563EB] transition-colors">
                {guide.h1}
              </h2>
              <p className="text-[#6B7280] text-[14px] leading-[1.7] mb-4 line-clamp-3">
                {guide.intro}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[#2563EB] text-[14px] font-semibold">
                Read Guide
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
