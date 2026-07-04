CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT TO anon, authenticated
  USING (rating >= 1);

INSERT INTO reviews (reviewer_name, rating, title, body, verified, product_name, created_at) VALUES
('Arjun M.', 5, 'Outstanding purity and fast delivery', 'I have been sourcing research peptides for our lab for over 2 years now. RetraLabs consistently delivers the highest purity products we have tested. The Tirzepatide arrived within 3 days, properly cold-packed, and our HPLC analysis confirmed >98% purity. Will continue ordering.', true, 'Tirzepatide', '2026-02-18'),
('Dr. Priya S.', 5, 'Best supplier in India, hands down', 'After trying multiple suppliers, RetraLabs stands out for quality and professionalism. Their GHK-Cu showed excellent results in our cell culture studies. Documentation and COA were provided promptly. Their WhatsApp support is incredibly responsive.', true, 'GHK-Cu', '2026-02-15'),
('Rahul K.', 5, 'Impressed with the quality', 'First time ordering from RetraLabs and I am genuinely impressed. The packaging was discreet and professional. Product quality matches what they advertise. The reconstitution calculator on their site is a nice touch for researchers.', true, 'Retatrutide', '2026-02-10'),
('Sneha D.', 4, 'Great products, slightly slow shipping', 'Product quality is top-notch, no complaints there. My IGF-1 LR3 tested perfectly in our assays. Only reason for 4 stars is shipping took 5 days to reach Bangalore. But the product itself is exactly as described.', true, 'IGF-1 LR3', '2026-02-05'),
('Vikram T.', 5, 'Reliable and consistent', 'Been ordering BPC-157 and Tirzepatide regularly for our research facility. Every batch has been consistent in quality. Their pricing is competitive and the customer service team always follows up. Highly recommend to fellow researchers.', true, 'Tirzepatide', '2026-01-28'),
('Amit P.', 5, 'Professional operation', 'What impressed me most was the attention to detail - proper cold chain shipping, clear labeling, and comprehensive COA with every order. The HGH 191aa was perfect for our study. RetraLabs is the real deal.', true, 'HGH 191aa', '2026-01-20'),
('Dr. Kavitha R.', 5, 'Excellent for research purposes', 'Our lab has been using RetraLabs peptides for several months now. The purity levels are consistently high and reproducible in our experiments. Their bacteriostatic water is also of excellent quality. A trusted supplier.', true, 'Bacteriostatic Water', '2026-01-15'),
('Nikhil G.', 4, 'Good quality, good value', 'Ordered the Retatrutide 10mg variant. Product arrived well-packaged and the quality was as expected. Price point is fair for the purity offered. Customer support was helpful when I had questions about storage.', true, 'Retatrutide', '2026-01-08'),
('Meera J.', 5, 'Trustworthy and transparent', 'In an industry full of questionable suppliers, RetraLabs stands out for transparency. They provide detailed COAs, respond to queries quickly, and their products deliver consistent results. Our go-to supplier now.', true, 'GHK-Cu', '2025-12-28')
ON CONFLICT DO NOTHING;
