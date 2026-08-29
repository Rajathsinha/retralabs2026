import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { getGuideBySlug, CATEGORIES } from '../data/seoData';
import { getArticleSchema, getItemListSchema } from '../utils/seoSchemas';
import { getBreadcrumbSchema } from '../utils/localSeoSchemas';
import { PRODUCTS } from '../data/products';
import { useCurrency } from '../context/CurrencyContext';
import { ChevronRight, ArrowRight, Star, FlaskConical } from 'lucide-react';
import { productDisplayName } from '../utils/productDisplayName';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const guide = slug ? getGuideBySlug(slug) : undefined;

  const canonicalUrl = `https://retralabs.in/guides/${slug}`;
  const pubDate = '2025-01-01';

  useSEO({
    title: guide?.title ?? 'Research Peptide Guides | RetraLabs',
    description: guide?.description ?? '',
    canonical: canonicalUrl,
    keywords: guide?.keywords,
    schema: guide ? [
      getArticleSchema({
        headline: guide.h1,
        description: guide.description,
        url: canonicalUrl,
        datePublished: pubDate,
        dateModified: pubDate,
      }),
      getBreadcrumbSchema([
        { name: 'Home', url: 'https://retralabs.in/' },
        { name: 'Guides', url: 'https://retralabs.in/guides' },
        { name: guide.h1, url: canonicalUrl },
      ]),
      ...(guide.faqs.length ? [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage' as const,
        mainEntity: guide.faqs.map(f => ({
          '@type': 'Question' as const,
          name: f.q,
          acceptedAnswer: { '@type': 'Answer' as const, text: f.a },
        })),
      }] : []),
    ] : undefined,
  });

  if (!guide) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <FlaskConical className="w-12 h-12 text-[#D1D5DB]" />
        <p className="text-[#6B7280] text-[15px]">Guide not found</p>
        <Link to="/guides" className="text-[#2563EB] text-[14px] font-semibold hover:underline">Back to Guides</Link>
      </div>
    );
  }

  const relatedProducts = guide.relatedProductIds
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const relatedCategories = CATEGORIES.filter(c => guide.relatedCategorySlugs.includes(c.slug));

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-[#F0F0F0]">
        <div className="max-w-[820px] mx-auto px-6 py-3.5">
          <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
            <Link to="/" className="hover:text-[#374151] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/guides" className="hover:text-[#374151] transition-colors">Guides</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium line-clamp-1">{guide.h1}</span>
          </nav>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-[820px] mx-auto px-6 py-12">
        <h1 className="text-[#111111] text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] leading-tight mb-4">
          {guide.h1}
        </h1>
        <p className="text-[#6B7280] text-[16px] leading-[1.8] mb-10">{guide.intro}</p>

        {guide.sections.map((section, i) => (
          <section key={i} className="mb-10">
            <h2 className="text-[#111111] text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] mb-4">{section.heading}</h2>
            <div className="space-y-3">
              {section.body.map((para, j) => (
                <p key={j} className="text-[#374151] text-[15px] leading-[1.8]">{para}</p>
              ))}
            </div>
          </section>
        ))}

        {/* FAQ */}
        {guide.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[#111111] text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] mb-5">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-3">
              {guide.faqs.map((faq, i) => (
                <details key={i} className="group bg-white border border-[#E5E7EB] rounded-[14px] px-5 py-4 open:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow" open={openFaq === i} onToggle={e => { if (e.currentTarget.open) setOpenFaq(i); }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                    <h3 className="text-[#111111] text-[15px] font-semibold">{faq.q}</h3>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 transition-transform group-open:rotate-90" strokeWidth={2} />
                  </summary>
                  <p className="text-[#6B7280] text-[14px] leading-[1.7] mt-3">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="mt-10 p-4 rounded-[14px] bg-[#EFF6FF] border border-[#BFDBFE]">
          <p className="text-[#1E40AF] text-[13px] font-medium leading-relaxed">
            <strong>Research Use Only</strong> — All products mentioned in this guide are supplied strictly for in-vitro laboratory research and analytical purposes. Not intended for human consumption.
          </p>
        </div>
      </article>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="max-w-[1200px] mx-auto px-6 py-10">
            <h2 className="text-[#111111] text-[20px] font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map(rp => {
                const rpPrice = Math.min(...rp.variants.map(v => v.price_inr));
                return (
                  <div key={rp.id} className="group bg-white border border-[#E5E7EB] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]" style={{ borderRadius: 16 }} onClick={() => navigate(`/product/${rp.id}`)}>
                    <div className="aspect-square bg-[#F8F9FA] flex items-center justify-center overflow-hidden">
                      <img src={rp.image_url} alt={`${rp.name} research peptide in India`} className="w-full h-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-[#111111] text-[13px] font-semibold line-clamp-1 mb-1">{productDisplayName(rp)}</h3>
                      <p className="text-[#111111] text-[14px] font-bold">{format(rpPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Related categories */}
      {relatedCategories.length > 0 && (
        <div className="border-t border-[#E5E7EB]">
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            <h2 className="text-[#111111] text-[18px] font-bold mb-4">Explore Categories</h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map(cat => (
                <Link key={cat.slug} to={`/category/${cat.slug}`} className="inline-flex items-center gap-2 px-5 py-3 border border-[#E5E7EB] rounded-[12px] text-[14px] font-semibold text-[#374151] hover:border-[#111111] hover:bg-[#FAFAFA] transition-all">
                  {cat.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
