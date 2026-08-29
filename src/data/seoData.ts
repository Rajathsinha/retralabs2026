import { PRODUCTS } from './products';

export interface CategoryDef {
  slug: string;
  label: string;
  h1: string;
  title: string;
  description: string;
  keywords: string;
  intro: string[];
  faqs: { q: string; a: string }[];
  productIds: string[];
}

export interface GuideDef {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  faqs: { q: string; a: string }[];
  relatedProductIds: string[];
  relatedCategorySlugs: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'metabolic-research',
    label: 'Metabolic Research',
    h1: 'Metabolic Research Peptides in India',
    title: 'Metabolic Research Peptides India — Retatrutide, Tirzepatide, Cagrilintide | RetraLabs',
    description: 'Buy metabolic research peptides in India — Retatrutide, Tirzepatide, Cagrilintide, AOD 9604 and MOTS-c. HPLC-verified, COA included, India-wide shipping with COD.',
    keywords: 'metabolic research peptides india, buy retatrutide india, buy tirzepatide india, buy cagrilintide india, buy aod 9604 india, buy mots-c india, glp-1 research india',
    intro: [
      'Metabolic research peptides are compounds studied for their effects on glucose regulation, energy expenditure, appetite signalling and body composition. RetraLabs supplies a focused catalogue of HPLC-verified metabolic peptides to researchers across India, each shipped with a Certificate of Analysis documenting purity and batch identity.',
      'The metabolic category includes incretin-based peptides (Retatrutide, Tirzepatide, Cagrilintide), mitochondrial peptides (MOTS-c), and growth-hormone fragments (AOD 9604, Tesamorelin) — all sourced from GMP-certified manufacturers and independently tested batch by batch.',
    ],
    faqs: [
      { q: 'What are metabolic research peptides?', a: 'Metabolic research peptides are compounds studied in laboratory settings for their effects on metabolic pathways — including glucose regulation, energy expenditure, appetite signalling and lipid metabolism. They are supplied strictly for in-vitro research and analytical purposes.' },
      { q: 'Which metabolic peptides are available in India?', a: 'RetraLabs supplies Retatrutide, Tirzepatide, Cagrilintide, MOTS-c, AOD 9604 and Tesamorelin in India — all HPLC-verified with COA, shipped India-wide with COD.' },
      { q: 'How are metabolic peptides shipped?', a: 'Every order ships in temperature-controlled, discreet packaging from Bengaluru with same-day dispatch for orders before 2 PM. Cash on Delivery is available across India.' },
    ],
    productIds: ['1', '2', '19', '15', '11', '10'],
  },
  {
    slug: 'recovery-research',
    label: 'Recovery Research',
    h1: 'Recovery & Tissue Repair Research Peptides in India',
    title: 'Recovery Research Peptides India — BPC-157, TB-500, Wolverine Stack | RetraLabs',
    description: 'Buy recovery and tissue repair research peptides in India — BPC-157, TB-500, and the Wolverine Stack. HPLC-verified, COA included, India-wide shipping with COD.',
    keywords: 'recovery research peptides india, buy bpc-157 india, buy tb-500 india, buy wolverine stack india, tissue repair peptide india, bpc-157 tb-500 india',
    intro: [
      'Recovery research peptides are compounds studied for tissue repair, wound healing, inflammation modulation and injury recovery. RetraLabs supplies HPLC-verified recovery peptides to researchers across India, each with a Certificate of Analysis.',
      'The recovery category includes BPC-157 (a body-protection compound), TB-500 (a Thymosin Beta-4 fragment), and pre-combined stacks like the Wolverine Stack — all sourced from GMP-certified manufacturers and independently tested.',
    ],
    faqs: [
      { q: 'What are recovery research peptides?', a: 'Recovery research peptides are compounds studied in laboratory settings for their effects on tissue repair, wound healing, and inflammation modulation. They are supplied strictly for in-vitro research and analytical purposes.' },
      { q: 'Which recovery peptides are available in India?', a: 'RetraLabs supplies BPC-157, TB-500, the Wolverine Stack (BPC-157 + TB-500), and the Klow Blend in India — all HPLC-verified with COA, shipped India-wide with COD.' },
      { q: 'What is the Wolverine Stack?', a: 'The Wolverine Stack is a pre-combined blend of BPC-157 and TB-500 (5mg each) studied in tissue-repair and recovery research. Available at RetraLabs with HPLC verification and COA.' },
    ],
    productIds: ['7', '9', '14', '12'],
  },
  {
    slug: 'cognitive-research',
    label: 'Cognitive Research',
    h1: 'Cognitive Research Peptides in India',
    title: 'Cognitive Research Peptides India — Semax, Selank | RetraLabs',
    description: 'Buy cognitive research peptides in India — Semax and Selank. HPLC-verified, COA included, India-wide shipping with COD from RetraLabs Bengaluru.',
    keywords: 'cognitive research peptides india, buy semax india, buy selank india, nootropic peptide india, semax india, selank india',
    intro: [
      'Cognitive research peptides are compounds studied for their effects on neuroprotection, cognitive function, anxiety modulation and central nervous system activity. RetraLabs supplies HPLC-verified cognitive peptides to researchers across India.',
      'The cognitive category includes Semax (a synthetic ACTH analogue) and Selank (a tuftsin-derived heptapeptide) — both sourced from GMP-certified manufacturers with independent HPLC testing and COA documentation.',
    ],
    faqs: [
      { q: 'What are cognitive research peptides?', a: 'Cognitive research peptides are compounds studied in laboratory settings for their effects on neuroprotection, cognitive function, and anxiety modulation. They are supplied strictly for in-vitro research and analytical purposes.' },
      { q: 'Which cognitive peptides are available in India?', a: 'RetraLabs supplies Semax and Selank in India — both HPLC-verified with COA, shipped India-wide with COD.' },
    ],
    productIds: ['4', '5'],
  },
  {
    slug: 'anti-aging-research',
    label: 'Anti-Aging Research',
    h1: 'Anti-Aging & Longevity Research Peptides in India',
    title: 'Anti-Aging Research Peptides India — GHK-Cu, Epithalon, NAD+, SS-31 | RetraLabs',
    description: 'Buy anti-aging and longevity research peptides in India — GHK-Cu, Epithalon, NAD+ and SS-31. HPLC-verified, COA included, India-wide shipping with COD.',
    keywords: 'anti-aging research peptides india, buy ghk-cu india, buy epithalon india, buy nad+ india, buy ss-31 india, longevity peptide india, copper peptide india',
    intro: [
      'Anti-aging research peptides are compounds studied for their effects on cellular repair, telomerase activity, oxidative stress reduction and skin regeneration. RetraLabs supplies HPLC-verified longevity peptides to researchers across India.',
      'The anti-aging category includes GHK-Cu (copper peptide), Epithalon (telomerase research), NAD+ (cellular energy), and SS-31 (mitochondrial targeting) — all with independent HPLC testing and COA.',
    ],
    faqs: [
      { q: 'What are anti-aging research peptides?', a: 'Anti-aging research peptides are compounds studied in laboratory settings for their effects on cellular repair, telomerase activity, oxidative stress and skin regeneration. They are supplied strictly for in-vitro research and analytical purposes.' },
      { q: 'Which anti-aging peptides are available in India?', a: 'RetraLabs supplies GHK-Cu, Epithalon, NAD+ and SS-31 in India — all HPLC-verified with COA, shipped India-wide with COD.' },
      { q: 'What is GHK-Cu?', a: 'GHK-Cu is a copper tripeptide complex studied for skin regeneration, wound healing and anti-aging research. RetraLabs supplies 99.1% HPLC-verified GHK-Cu in India with COA.' },
    ],
    productIds: ['3', '16', '8', '18'],
  },
  {
    slug: 'hormone-research',
    label: 'Hormone Research',
    h1: 'Hormone & Growth Factor Research Peptides in India',
    title: 'Hormone Research Peptides India — CJC-1295 + Ipamorelin, Kisspeptin-10, Tesamorelin | RetraLabs',
    description: 'Buy hormone and growth factor research peptides in India — CJC-1295 + Ipamorelin stack, Kisspeptin-10, Tesamorelin. HPLC-verified, COA included, India-wide shipping.',
    keywords: 'hormone research peptides india, buy cjc-1295 ipamorelin india, buy kisspeptin india, buy tesamorelin india, ghrh research india, growth hormone peptide india',
    intro: [
      'Hormone research peptides are compounds studied for their effects on growth hormone secretion, reproductive endocrinology and hormonal signalling pathways. RetraLabs supplies HPLC-verified hormone peptides to researchers across India.',
      'The hormone category includes the CJC-1295 + Ipamorelin stack (GHRH + secretagogue), Tesamorelin (GHRH analogue), and Kisspeptin-10 (GnRH regulation) — all with independent HPLC testing and COA.',
    ],
    faqs: [
      { q: 'What are hormone research peptides?', a: 'Hormone research peptides are compounds studied in laboratory settings for their effects on growth hormone secretion, reproductive endocrinology and hormonal signalling. They are supplied strictly for in-vitro research and analytical purposes.' },
      { q: 'Which hormone peptides are available in India?', a: 'RetraLabs supplies the CJC-1295 + Ipamorelin stack, Tesamorelin and Kisspeptin-10 in India — all HPLC-verified with COA, shipped India-wide with COD.' },
    ],
    productIds: ['13', '17', '10'],
  },
];

export const GUIDES: GuideDef[] = [
  {
    slug: 'what-are-research-peptides',
    title: 'What Are Research Peptides? A Complete Guide for Indian Researchers | RetraLabs',
    description: 'Learn what research peptides are, how they differ from pharmaceuticals, purity standards, and how to source verified peptides in India. A guide by RetraLabs.',
    keywords: 'what are research peptides, research peptides india, peptide research guide, peptide purity india, what is a peptide',
    h1: 'What Are Research Peptides?',
    intro: 'Research peptides are short chains of amino acids — typically 2 to 50 residues — synthesised for laboratory and analytical research. Unlike pharmaceutical-grade drugs, research peptides are supplied without clinical approval and are intended solely for in-vitro experimentation, receptor studies, and analytical method development. This guide explains what research peptides are, how they are tested, and what researchers in India should look for when sourcing them.',
    sections: [
      {
        heading: 'Peptide Structure and Synthesis',
        body: [
          'Peptides are composed of amino acids linked by peptide bonds. In research contexts, they are synthesised using solid-phase peptide synthesis (SPPS), which allows precise control over the amino acid sequence and resulting molecular structure.',
          'Research-grade peptides are typically supplied as lyophilised (freeze-dried) powders in sterile, nitrogen-sealed vials. This form maximises shelf stability — lyophilised peptides can be stored at -20°C for years without significant degradation.',
        ],
      },
      {
        heading: 'Purity and Analytical Testing',
        body: [
          'The gold standard for peptide purity verification is high-performance liquid chromatography (HPLC). HPLC separates the peptide from impurities and residual solvents, producing a chromatogram that quantifies purity as a percentage.',
          'A Certificate of Analysis (COA) documents the HPLC purity result, batch number, molecular weight, and identity confirmation. At RetraLabs, every batch is HPLC-tested to 99%+ purity before it ships, and the COA is available with every order.',
          'Researchers should be cautious of suppliers who cannot provide HPLC data. The Indian peptide market includes grey-market sellers who re-label bulk powders without verification — a COA and HPLC trace are the only way to confirm you are working with what the label claims.',
        ],
      },
      {
        heading: 'Research Peptides vs. Pharmaceuticals',
        body: [
          'Research peptides are not approved medicines. They are supplied for laboratory research — receptor binding studies, cell-based assays, analytical method development, and stability testing. They are not intended for human consumption, diagnosis, or treatment of any condition.',
          'RetraLabs sells exclusively to qualified researchers and institutions. We do not provide dosing guidance, administration protocols, or medical advice. All purchasers must confirm their products are for research use only.',
        ],
      },
      {
        heading: 'Sourcing Research Peptides in India',
        body: [
          'India\'s research peptide market has historically been fragmented — dominated by B2B marketplace listings of varying authenticity. Researchers should look for three things: (1) HPLC purity data with a COA, (2) GMP-certified manufacturing sources, and (3) transparent batch traceability.',
          'RetraLabs was founded in 2019 by researchers who were scammed by grey-market sellers. Every product is sourced from GMP-certified manufacturers, independently HPLC-tested, and shipped with a COA. We operate from Bengaluru with India-wide shipping and Cash on Delivery.',
        ],
      },
    ],
    faqs: [
      { q: 'Are research peptides legal in India?', a: 'Research peptides are supplied in India for laboratory and analytical research purposes. They are not approved pharmaceuticals and are not for human consumption. Purchasers must comply with all applicable regulations.' },
      { q: 'What purity should research peptides be?', a: 'Research-grade peptides should be at least 98% pure, verified by HPLC. RetraLabs peptides are tested to 99%+ purity with a Certificate of Analysis on every order.' },
      { q: 'How should research peptides be stored?', a: 'Lyophilised peptides should be stored at -20°C or below. Once reconstituted with bacteriostatic water, store at 2-8°C and avoid repeated freeze-thaw cycles.' },
    ],
    relatedProductIds: ['1', '2', '3', '7'],
    relatedCategorySlugs: ['metabolic-research', 'recovery-research'],
  },
  {
    slug: 'peptide-storage-guide',
    title: 'Research Peptide Storage Guide — Temperature, Reconstitution & Stability | RetraLabs',
    description: 'How to store research peptides: lyophilised powder storage, reconstitution with bacteriostatic water, temperature requirements, and shelf life. A RetraLabs guide.',
    keywords: 'peptide storage guide, how to store peptides, peptide reconstitution, bacteriostatic water, peptide shelf life, lyophilised peptide storage india',
    h1: 'Research Peptide Storage Guide',
    intro: 'Proper storage is critical for maintaining peptide integrity. This guide covers lyophilised powder storage, reconstitution with bacteriostatic water, temperature requirements, and best practices for researchers in India.',
    sections: [
      {
        heading: 'Lyophilised Powder Storage',
        body: [
          'Peptides are supplied as lyophilised (freeze-dried) powders in sterile, nitrogen-sealed vials. In this form, peptides are remarkably stable and can be stored at -20°C for 12-24 months without significant degradation.',
          'Store vials in a dedicated freezer, away from light and moisture. Do not remove the vial cap until you are ready to reconstitute — exposure to moisture causes rapid degradation.',
        ],
      },
      {
        heading: 'Reconstitution',
        body: [
          'Reconstitution is the process of dissolving the lyophilised powder in a solvent to create a working solution. Bacteriostatic water (0.9% benzyl alcohol) is the standard solvent for most research peptides.',
          'Add the bacteriostatic water slowly down the side of the vial, not directly onto the powder. Gently swirl — do not shake — until fully dissolved. Shaking can denature the peptide.',
          'RetraLabs bundles bacteriostatic water automatically with every peptide order for reconstitution convenience.',
        ],
      },
      {
        heading: 'Post-Reconstitution Storage',
        body: [
          'Once reconstituted, peptides are significantly less stable. Store reconstituted solutions at 2-8°C (refrigerator) and use within the timeframe appropriate for your research protocol.',
          'Avoid repeated freeze-thaw cycles. Each cycle degrades the peptide. If you need multiple aliquots, divide the reconstituted solution into separate vials before freezing.',
        ],
      },
    ],
    faqs: [
      { q: 'How long do lyophilised peptides last?', a: 'Lyophilised peptides stored at -20°C are typically stable for 12-24 months. Always check the COA for batch-specific guidance.' },
      { q: 'What temperature should peptides be stored at?', a: 'Lyophilised peptides: -20°C or below. Reconstituted peptides: 2-8°C (refrigerator). Avoid room temperature storage for extended periods.' },
      { q: 'Where can I buy bacteriostatic water in India?', a: 'Pharmaceutical-grade bacteriostatic water is available at RetraLabs and is automatically bundled with every peptide order.' },
    ],
    relatedProductIds: ['6', '1', '7'],
    relatedCategorySlugs: ['recovery-research', 'metabolic-research'],
  },
  {
    slug: 'hplc-purity-testing-guide',
    title: 'HPLC Purity Testing & COA: How to Verify Research Peptides | RetraLabs',
    description: 'Understand HPLC purity testing, how to read a Certificate of Analysis, and why batch verification matters when buying research peptides in India. A RetraLabs guide.',
    keywords: 'hplc peptide testing, certificate of analysis peptide, peptide purity testing, coa guide, how to verify peptide purity india',
    h1: 'HPLC Purity Testing & Certificate of Analysis Guide',
    intro: 'HPLC (high-performance liquid chromatography) is the analytical method used to verify peptide purity. This guide explains how HPLC works, how to read a Certificate of Analysis (COA), and why independent batch testing matters for researchers in India.',
    sections: [
      {
        heading: 'What is HPLC?',
        body: [
          'High-performance liquid chromatography separates compounds based on their chemical properties as they pass through a chromatographic column. For peptides, reverse-phase HPLC is the standard method — it separates the target peptide from impurities, truncated sequences, and residual solvents.',
          'The output is a chromatogram: a graph showing peaks over time. The area under the main peak, expressed as a percentage of total peak area, is the purity value. A 99% purity result means 99% of the detected material is the target peptide.',
        ],
      },
      {
        heading: 'How to Read a Certificate of Analysis',
        body: [
          'A COA should include: (1) the peptide name and sequence, (2) the HPLC purity percentage, (3) the batch number, (4) the molecular weight, (5) the appearance description, and (6) the testing date.',
          'At RetraLabs, every order includes a COA. Researchers can request the full HPLC chromatogram to independently verify the purity claim. If a supplier cannot provide HPLC data, that is a red flag.',
        ],
      },
      {
        heading: 'Why Independent Batch Testing Matters',
        body: [
          'The Indian research peptide market includes sellers who re-label bulk powders without testing. Without independent HPLC verification, there is no way to confirm the vial contains what the label claims.',
          'RetraLabs tests every batch independently — not relying on manufacturer certificates alone. Batches below 98% purity are rejected. This is the verification gap RetraLabs was built to fill.',
        ],
      },
    ],
    faqs: [
      { q: 'What is a good peptide purity percentage?', a: 'Research-grade peptides should be at least 98% pure by HPLC. RetraLabs peptides are tested to 99%+ purity.' },
      { q: 'What is a COA?', a: 'A Certificate of Analysis (COA) documents the HPLC purity result, batch number, molecular weight, and identity confirmation for a peptide batch. It is the primary quality document for research peptides.' },
      { q: 'Can I get the HPLC chromatogram for my order?', a: 'Yes. RetraLabs provides the full HPLC chromatogram on request for any batch. The COA is included with every order.' },
    ],
    relatedProductIds: ['1', '2', '3'],
    relatedCategorySlugs: ['metabolic-research', 'anti-aging-research'],
  },
  {
    slug: 'retatrutide-research-overview',
    title: 'Retatrutide Research Overview — Mechanism, Purity & Sourcing in India | RetraLabs',
    description: 'A research overview of Retatrutide (LY3437943): triple receptor agonist mechanism, HPLC purity standards, and how to source verified Retatrutide in India. By RetraLabs.',
    keywords: 'retatrutide research, retatrutide mechanism, retatrutide india, retatrutide overview, ly3437943, retatrutide peptide research',
    h1: 'Retatrutide Research Overview',
    intro: 'Retatrutide (LY3437943) is a triple receptor agonist targeting the GLP-1, GIP, and glucagon receptors. It is one of the most-researched next-generation incretin peptides, studied for its effects on energy expenditure, glucose regulation, and body composition. This overview covers its mechanism, purity standards, and sourcing in India.',
    sections: [
      {
        heading: 'Mechanism of Action',
        body: [
          'Retatrutide acts on three receptors simultaneously: GLP-1 (glucagon-like peptide-1), GIP (glucose-dependent insulinotropic polypeptide), and glucagon. This triple agonism distinguishes it from dual agonists like Tirzepatide (GLP-1 + GIP) and single agonists like semaglutide (GLP-1 only).',
          'The glucagon receptor activity is particularly notable — it is associated with increased energy expenditure and fat oxidation, which is why Retatrutide is studied in metabolic and obesity research.',
        ],
      },
      {
        heading: 'Purity and Quality Standards',
        body: [
          'RetraLabs supplies Retatrutide at 99.2% HPLC-verified purity. Every batch is independently tested by HPLC, and a Certificate of Analysis documents purity, batch number, and identity.',
          'Retatrutide is supplied as a sterile, nitrogen-sealed lyophilised powder from GMP-certified manufacturers. Pricing starts at ₹3,600 for a 10mg starter vial, with multi-vial packs at lower per-vial cost.',
        ],
      },
      {
        heading: 'Retatrutide vs. Tirzepatide',
        body: [
          'Tirzepatide is a dual GIP/GLP-1 receptor agonist. Retatrutide adds a third target — the glucagon receptor — making it a triple agonist. The additional glucagon activity is studied for its effects on energy expenditure, which is not a primary target of Tirzepatide.',
          'Both are available from RetraLabs in India with HPLC verification and COA. Researchers choose based on their specific receptor-pathway requirements.',
        ],
      },
    ],
    faqs: [
      { q: 'What is Retatrutide?', a: 'Retatrutide (LY3437943) is a triple receptor agonist targeting GLP-1, GIP, and glucagon receptors, studied in metabolic and obesity research.' },
      { q: 'Where can I buy Retatrutide in India?', a: 'RetraLabs supplies 99.2% HPLC-verified Retatrutide in India with COA, starting at ₹3,600 for 10mg. India-wide shipping with COD.' },
      { q: 'What is the difference between Retatrutide and Tirzepatide?', a: 'Tirzepatide is a dual GIP/GLP-1 agonist. Retatrutide is a triple agonist that also targets the glucagon receptor, studied for broader metabolic effects.' },
    ],
    relatedProductIds: ['1', '2', '19'],
    relatedCategorySlugs: ['metabolic-research'],
  },
  {
    slug: 'ghk-cu-research-overview',
    title: 'GHK-Cu Research Overview — Copper Peptide Mechanism & Sourcing in India | RetraLabs',
    description: 'A research overview of GHK-Cu (copper tripeptide): mechanism, skin regeneration studies, HPLC purity, and how to source verified GHK-Cu in India. By RetraLabs.',
    keywords: 'ghk-cu research, ghk-cu mechanism, copper peptide research, ghk-cu india, ghk-cu overview, copper tripeptide',
    h1: 'GHK-Cu Research Overview',
    intro: 'GHK-Cu (glycyl-L-histidyl-L-lysine copper) is a copper tripeptide complex studied for skin regeneration, wound healing, and anti-aging research. This overview covers its mechanism, purity standards, and sourcing in India.',
    sections: [
      {
        heading: 'Mechanism of Action',
        body: [
          'GHK-Cu is a naturally occurring copper-binding tripeptide found in human plasma. In research settings, it is studied for its effects on collagen synthesis, elastin production, and tissue regeneration.',
          'The copper ion in the complex is biologically active and is studied for its role in enzymatic processes related to skin remodeling and wound repair.',
        ],
      },
      {
        heading: 'Purity and Quality Standards',
        body: [
          'RetraLabs supplies GHK-Cu at 99.1% HPLC-verified purity. Every batch is independently tested, and a Certificate of Analysis documents purity, batch number, and identity.',
          'GHK-Cu is supplied as a lyophilised powder in 100mg and 200mg quantities, starting at ₹4,400. Bacteriostatic water is bundled for reconstitution.',
        ],
      },
    ],
    faqs: [
      { q: 'What is GHK-Cu?', a: 'GHK-Cu is a copper tripeptide complex studied for skin regeneration, wound healing, and anti-aging research. It is a naturally occurring peptide that binds copper ions.' },
      { q: 'Where can I buy GHK-Cu in India?', a: 'RetraLabs supplies 99.1% HPLC-verified GHK-Cu in India with COA, from ₹4,400 for 100mg. India-wide shipping with COD.' },
      { q: 'What is the price of GHK-Cu in India?', a: 'At RetraLabs, GHK-Cu is ₹4,400 for 100mg and ₹8,400 for 200mg (2×100mg). All include HPLC purity verification and COA.' },
    ],
    relatedProductIds: ['3', '16', '8'],
    relatedCategorySlugs: ['anti-aging-research'],
  },
  {
    slug: 'bpc-157-research-overview',
    title: 'BPC-157 Research Overview — Mechanism, Tissue Repair Studies & Sourcing in India | RetraLabs',
    description: 'A research overview of BPC-157: body protection compound mechanism, tissue repair studies, HPLC purity, and how to source verified BPC-157 in India. By RetraLabs.',
    keywords: 'bpc-157 research, bpc-157 mechanism, bpc-157 india, bpc-157 overview, body protection compound, bpc-157 tissue repair',
    h1: 'BPC-157 Research Overview',
    intro: 'BPC-157 (Body Protection Compound) is a pentadecapeptide derived from human gastric juice, studied for tissue repair, gut health, and injury recovery research. This overview covers its mechanism, purity standards, and sourcing in India.',
    sections: [
      {
        heading: 'Mechanism of Action',
        body: [
          'BPC-157 is studied for its effects on angiogenesis (blood vessel formation), fibroblast activity, and collagen deposition — processes central to tissue repair and wound healing.',
          'It is also studied in gut-health research for its potential effects on intestinal mucosal integrity.',
        ],
      },
      {
        heading: 'Purity and Quality Standards',
        body: [
          'RetraLabs supplies BPC-157 at 99.3% HPLC-verified purity. Every batch is independently tested, and a Certificate of Analysis documents purity, batch number, and identity.',
          'BPC-157 is available from ₹2,800 for a single 10mg vial, with multi-vial packs at lower per-vial cost. It is also available as part of the Wolverine Stack (BPC-157 + TB-500).',
        ],
      },
      {
        heading: 'BPC-157 and TB-500',
        body: [
          'BPC-157 and TB-500 are frequently studied together in tissue-repair research. The Wolverine Stack pre-combines both (5mg each) in a single vial for researchers studying their combined effects.',
          'Both are available individually and as a stack from RetraLabs with HPLC verification and COA.',
        ],
      },
    ],
    faqs: [
      { q: 'What is BPC-157?', a: 'BPC-157 is a body protection compound derived from human gastric juice, studied for tissue repair, gut health, and injury recovery research.' },
      { q: 'Where can I buy BPC-157 in India?', a: 'RetraLabs supplies 99.3% HPLC-verified BPC-157 in India with COA, from ₹2,800 for 10mg. India-wide shipping with COD.' },
      { q: 'What is the Wolverine Stack?', a: 'The Wolverine Stack combines BPC-157 and TB-500 (5mg each) in a single vial, studied together in tissue-repair and recovery research.' },
    ],
    relatedProductIds: ['7', '9', '14'],
    relatedCategorySlugs: ['recovery-research'],
  },
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}

export function getGuideBySlug(slug: string): GuideDef | undefined {
  return GUIDES.find(g => g.slug === slug);
}

export function getCategoryProducts(slug: string) {
  const cat = getCategoryBySlug(slug);
  if (!cat) return [];
  return cat.productIds
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}
