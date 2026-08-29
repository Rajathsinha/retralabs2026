import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { getCategoryBySlug, getCategoryProducts, CATEGORIES } from '../data/seoData';
import { getCategorySchema } from '../utils/seoSchemas';
import { useCurrency } from '../context/CurrencyContext';
import { ChevronRight, Star, ArrowRight, Check } from 'lucide-react';
import { productDisplayName } from '../utils/productDisplayName';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const category = slug ? getCategoryBySlug(slug) : undefined;
  const products = slug ? getCategoryProducts(slug) : [];

  useSEO({
    title: category?.title ?? 'Research Peptides India | RetraLabs',
    description: category?.description ?? '',
    canonical: `https://retralabs.in/category/${slug}`,
    keywords: category?.keywords,
    schema: category ? getCategorySchema(slug!) : undefined,
  });

  if (!category) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-[#6B7280] text-[15px]">Category not found</p>
        <Link to="/catalogue" className="text-[#2563EB] text-[14px] font-semibold hover:underline">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-[#F0F0F0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5">
          <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
            <Link to="/" className="hover:text-[#374151] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/catalogue" className="hover:text-[#374151] transition-colors">Shop</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#374151] font-medium">{category.label}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 sm:py-14">
          <h1 className="text-[#111111] text-[32px] sm:text-[42px] font-bold tracking-[-0.02em] leading-tight mb-4">
            {category.h1}
          </h1>
          <div className="space-y-3 max-w-[680px]">
            {category.intro.map((para, i) => (
              <p key={i} className="text-[#6B7280] text-[15px] leading-[1.8]">{para}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map(product => {
            const lowestPrice = Math.min(...product.variants.map(v => v.price_inr));
            return (
              <div
                key={product.id}
                className="group bg-white border border-[#EBEBEB] flex flex-col cursor-pointer transition-all duration-300 hover:border-[#D0D0D0] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
                style={{ borderRadius: 18 }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative overflow-hidden bg-[#F8F9FA] flex items-center justify-center" style={{ borderRadius: '18px 18px 0 0', aspectRatio: '1 / 1' }}>
                  <img src={product.image_url} alt={`${product.name} research peptide in India`} className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                  <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] uppercase bg-[#EFF6FF] text-[#2563EB]" style={{ borderRadius: 8 }}>RESEARCH USE ONLY</div>
                </div>
                <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2">
                  <h2 className="text-[#111111] text-[14px] sm:text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                    {productDisplayName(product)}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />)}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[#111111] text-[15px] sm:text-[16px] font-bold">{format(lowestPrice)}</span>
                    <span className="text-[#9CA3AF] text-[11px]">onwards</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="max-w-[820px] mx-auto px-6 py-14">
          <h2 className="text-[#111111] text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] mb-6">
            {category.label} — Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {category.faqs.map((faq, i) => (
              <details key={i} className="group bg-white border border-[#E5E7EB] rounded-[14px] px-5 py-4 open:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow" open={openFaq === i} onToggle={e => { if (e.currentTarget.open) setOpenFaq(i); }}>
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <h3 className="text-[#111111] text-[15px] font-semibold">{faq.q}</h3>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 transition-transform group-open:rotate-90" strokeWidth={2} />
                </summary>
                <p className="text-[#6B7280] text-[14px] leading-[1.7] mt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Related categories */}
      <div className="border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <h2 className="text-[#111111] text-[20px] font-bold mb-6">Explore Other Categories</h2>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.filter(c => c.slug !== slug).map(cat => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="inline-flex items-center gap-2 px-5 py-3 border border-[#E5E7EB] rounded-[12px] text-[14px] font-semibold text-[#374151] hover:border-[#111111] hover:bg-[#FAFAFA] transition-all"
              >
                {cat.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* COD banner */}
      <div className="max-w-[1200px] mx-auto px-6 pb-12">
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-7 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderRadius: 18 }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[12px] bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-[#16a34a]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[#111111] text-[16px] font-bold leading-snug">Cash on Delivery (COD) Available</h3>
              <p className="text-[#6B7280] text-[14px] mt-0.5">Pay when your order arrives at your doorstep.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
