/**
 * Per-product SEO content, keyed by product name (matches the maps in
 * ProductDetailPage.tsx). `intro` paragraphs render inside the Description
 * tab; `faqs` render as an always-visible section below the tabs AND as
 * FAQPage structured data. Both get captured by the prerenderer, so this is
 * real crawlable content — not JS-only.
 *
 * Products without an entry fall back to the short description already in
 * products.ts (safe: the UI guards with optional chaining).
 */
export interface ProductContent {
  /** Optional H2 shown above the intro (used for money-keyword targeting). */
  heading?: string;
  intro: string[];
  faqs: { q: string; a: string }[];
}

const shipping =
  'Every order ships India-wide from Bengaluru with temperature-controlled, discreet packaging and a Certificate of Analysis (COA). Cash on Delivery is available, alongside UPI and bank transfer.';

export const PRODUCT_CONTENT: Record<string, ProductContent> = {
  'Retatrutide': {
    heading: 'Where to Buy Retatrutide in India',
    intro: [
      'Retatrutide (LY3437943) is a triple receptor agonist acting on the GLP-1, GIP, and glucagon receptors, studied in metabolic and obesity research for its effects on energy expenditure and body composition. RetraLabs supplies research-grade Retatrutide in India at 99.2% HPLC-verified purity, with a Certificate of Analysis included on every order.',
      'RetraLabs is India’s trusted source to buy Retatrutide online for laboratory use. Each vial is a sterile, nitrogen-sealed lyophilised powder sourced from GMP-certified manufacturers and independently HPLC tested. Pricing starts at ₹3,600 for a 10mg starter vial, with multi-vial packs at lower per-vial cost.',
      `Retatrutide is available across India — Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Pune and beyond. ${shipping} All products are strictly for laboratory and analytical research; not for human consumption.`,
    ],
    faqs: [
      { q: 'Where can I buy Retatrutide in India?', a: 'You can buy research-grade Retatrutide in India from RetraLabs (retralabs.in). Every vial is 99.2% HPLC-verified with a Certificate of Analysis, shipped India-wide from Bengaluru with Cash on Delivery available.' },
      { q: 'What is the price of Retatrutide in India?', a: 'At RetraLabs, Retatrutide starts at ₹3,600 for a 10mg starter vial, with lower per-vial pricing on 10mg×2 and 10mg×5 packs. All include a COA and HPLC report.' },
      { q: 'Is Retatrutide legal to buy in India?', a: 'Retatrutide is supplied strictly for laboratory and analytical research purposes. RetraLabs sells only to qualified researchers. It is not approved for human consumption.' },
      { q: 'How is Retatrutide shipped and stored?', a: 'It ships as a lyophilised powder in temperature-controlled, discreet packaging. Store lyophilised vials at -20°C; once reconstituted, store at 2–8°C and avoid repeated freeze-thaw cycles.' },
    ],
  },

  'Tirzepatide': {
    heading: 'Where to Buy Tirzepatide in India',
    intro: [
      'Tirzepatide is a dual GIP and GLP-1 receptor agonist widely studied in metabolic and glucose-regulation research. RetraLabs supplies research-grade Tirzepatide in India at 99.4% HPLC-verified purity with a Certificate of Analysis on every order.',
      'RetraLabs is a trusted source to buy Tirzepatide online in India for laboratory use. Each vial is a sterile, nitrogen-sealed lyophilised powder from GMP-certified manufacturers, independently HPLC tested, starting at ₹2,800.',
      `Tirzepatide ships across India with COA included. ${shipping} For research use only; not for human consumption.`,
    ],
    faqs: [
      { q: 'Where to buy Tirzepatide in India?', a: 'Tirzepatide for research use is available in India at RetraLabs — 99.4% HPLC-verified with a COA, shipped India-wide with Cash on Delivery available.' },
      { q: 'What is the price of Tirzepatide in India?', a: 'RetraLabs Tirzepatide starts at ₹2,800 per vial with lower per-vial pricing on multi-vial packs. Every order includes a COA and HPLC report.' },
      { q: 'Is Tirzepatide legal to buy in India?', a: 'Tirzepatide is supplied strictly for laboratory and analytical research. RetraLabs sells only to qualified researchers; it is not for human consumption.' },
    ],
  },

  'GHK-Cu': {
    heading: 'Where to Buy GHK-Cu in India',
    intro: [
      'GHK-Cu is a copper tripeptide complex studied for skin regeneration, wound-healing and anti-aging research. RetraLabs supplies research-grade GHK-Cu in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy GHK-Cu online in India from RetraLabs — sterile lyophilised vials from GMP-certified sources, starting at ₹3,500 for 50mg. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy GHK-Cu in India?', a: 'GHK-Cu for research is available at RetraLabs — 99.1% HPLC-verified copper peptide with a COA, shipped India-wide with COD available.' },
      { q: 'What is the price of GHK-Cu in India?', a: 'RetraLabs GHK-Cu starts at ₹3,500 for a 50mg vial, with 50mg×2 and 50mg×5 packs at lower per-vial cost.' },
      { q: 'Is GHK-Cu for research use only?', a: 'Yes. GHK-Cu is supplied strictly for laboratory and analytical research and is not for human consumption.' },
    ],
  },

  'BPC-157': {
    heading: 'Where to Buy BPC-157 in India',
    intro: [
      'BPC-157 is a body-protection compound derived from a gastric protein, studied for tissue repair, gut-health and injury-recovery research. RetraLabs supplies research-grade BPC-157 in India at 99.3% HPLC-verified purity with a Certificate of Analysis.',
      `Buy BPC-157 online in India from RetraLabs — sterile lyophilised vials, independently HPLC tested. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy BPC-157 in India?', a: 'BPC-157 for research is available at RetraLabs — 99.3% HPLC-verified with a COA, shipped India-wide with Cash on Delivery available.' },
      { q: 'Is BPC-157 legal to buy in India?', a: 'BPC-157 is supplied strictly for laboratory and analytical research to qualified researchers. It is not approved for human consumption.' },
    ],
  },

  'TB-500': {
    intro: [
      'TB-500 is a synthetic fragment of Thymosin Beta-4 studied for tissue regeneration, recovery and inflammation-modulation research. RetraLabs supplies research-grade TB-500 in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy TB-500 online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy TB-500 in India?', a: 'TB-500 for research is available at RetraLabs — 99.1% HPLC-verified with a COA, shipped India-wide with COD available.' },
      { q: 'Is TB-500 for research use only?', a: 'Yes. TB-500 is supplied strictly for laboratory research and is not for human consumption.' },
    ],
  },

  'Semax': {
    intro: [
      'Semax is a synthetic ACTH-analogue nootropic peptide studied for cognitive-function, neuroprotection and CNS research. RetraLabs supplies research-grade Semax in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy Semax online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Semax in India?', a: 'Semax for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
      { q: 'Is Semax for research use only?', a: 'Yes. Semax is supplied strictly for laboratory research and is not for human consumption.' },
    ],
  },

  'Selank': {
    intro: [
      'Selank is an anxiolytic and nootropic heptapeptide derived from tuftsin, studied for anti-anxiety and cognitive research. RetraLabs supplies research-grade Selank in India at 99.2% HPLC-verified purity with a Certificate of Analysis.',
      `Buy Selank online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Selank in India?', a: 'Selank for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
      { q: 'Is Selank for research use only?', a: 'Yes. Selank is supplied strictly for laboratory research and is not for human consumption.' },
    ],
  },

  'NAD+': {
    intro: [
      'NAD+ (nicotinamide adenine dinucleotide) is a coenzyme central to cellular energy metabolism, DNA repair and longevity research. RetraLabs supplies research-grade NAD+ in India at 99.0% HPLC-verified purity with a Certificate of Analysis.',
      `Buy NAD+ online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy NAD+ in India?', a: 'NAD+ for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
      { q: 'Is NAD+ for research use only?', a: 'Yes. NAD+ is supplied strictly for laboratory research and is not for human consumption.' },
    ],
  },

  'Tesamorelin': {
    intro: [
      'Tesamorelin is a GHRH analogue that stimulates growth-hormone release, studied for metabolic-regulation and body-composition research. RetraLabs supplies research-grade Tesamorelin in India at 99.2% HPLC-verified purity with a Certificate of Analysis, starting at ₹6,200 for 10mg.',
      `Buy Tesamorelin online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Tesamorelin in India?', a: 'Tesamorelin for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
      { q: 'What is the price of Tesamorelin in India?', a: 'RetraLabs Tesamorelin starts at ₹6,200 for 10mg, with 10mg×2 and 10mg×5 packs at lower per-vial cost.' },
    ],
  },

  'MOT-C': {
    intro: [
      'MOTS-c is a mitochondrial-derived peptide studied for metabolic regulation, insulin sensitivity and cellular-homeostasis research. RetraLabs supplies research-grade MOTS-c in India at 99.0% HPLC-verified purity with a Certificate of Analysis.',
      `Buy MOTS-c online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy MOTS-c in India?', a: 'MOTS-c for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'Cagrilintide': {
    intro: [
      'Cagrilintide is a long-acting amylin analogue studied in metabolic and appetite-regulation research. RetraLabs supplies research-grade Cagrilintide in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy Cagrilintide online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Cagrilintide in India?', a: 'Cagrilintide for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'AOD 9604': {
    intro: [
      'AOD 9604 is a modified fragment of human growth hormone studied for metabolic and fat-metabolism research. RetraLabs supplies research-grade AOD 9604 in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy AOD 9604 online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy AOD 9604 in India?', a: 'AOD 9604 for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'Epithalon': {
    intro: [
      'Epithalon is a synthetic tetrapeptide studied for telomerase-activity and longevity research. RetraLabs supplies research-grade Epithalon in India at 99.2% HPLC-verified purity with a Certificate of Analysis.',
      `Buy Epithalon online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Epithalon in India?', a: 'Epithalon for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'Kisspeptin-10': {
    intro: [
      'Kisspeptin-10 is a peptide studied for reproductive-endocrinology and hormone-signalling research. RetraLabs supplies research-grade Kisspeptin-10 in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy Kisspeptin-10 online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy Kisspeptin-10 in India?', a: 'Kisspeptin-10 for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'SS-31': {
    intro: [
      'SS-31 (Elamipretide) is a mitochondria-targeting peptide studied for cellular-energy and anti-aging research. RetraLabs supplies research-grade SS-31 in India at 99.0% HPLC-verified purity with a Certificate of Analysis.',
      `Buy SS-31 online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy SS-31 in India?', a: 'SS-31 for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'CJC-1295 (No DAC) + Ipamorelin Stack': {
    intro: [
      'The CJC-1295 (No DAC) + Ipamorelin stack pairs a GHRH analogue with a growth-hormone secretagogue, studied together in growth-hormone-axis research. RetraLabs supplies this research-grade stack in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy the CJC-1295 + Ipamorelin stack online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy CJC-1295 and Ipamorelin in India?', a: 'The CJC-1295 (No DAC) + Ipamorelin stack for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'The Wolverine Stack': {
    intro: [
      'The Wolverine Stack combines BPC-157 and TB-500, studied together in tissue-repair and recovery research. RetraLabs supplies this research-grade stack in India at 99.1% HPLC-verified purity with a Certificate of Analysis.',
      `Buy the Wolverine Stack online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy the Wolverine Stack (BPC-157 + TB-500) in India?', a: 'The Wolverine Stack for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'Klow Blend': {
    intro: [
      'The Klow Blend is a multi-peptide healing blend studied in tissue-repair research. RetraLabs supplies the research-grade Klow Blend in India at 99.0% HPLC-verified purity with a Certificate of Analysis.',
      `Buy the Klow Blend online in India from RetraLabs. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy the Klow Blend in India?', a: 'The Klow Blend for research is available at RetraLabs — HPLC-verified with a COA, shipped India-wide with COD available.' },
    ],
  },

  'Bacteriostatic Water (Pharma Grade)': {
    intro: [
      'Pharmaceutical-grade bacteriostatic water (0.9% benzyl alcohol) is used to reconstitute lyophilised research peptides. RetraLabs supplies sterile bacteriostatic water in India for laboratory use.',
      `Add bacteriostatic water to any peptide order. ${shipping} For laboratory research use only.`,
    ],
    faqs: [
      { q: 'Where to buy bacteriostatic water in India?', a: 'Pharmaceutical-grade bacteriostatic water is available at RetraLabs, shipped India-wide with your peptide order and Cash on Delivery available.' },
    ],
  },
};
