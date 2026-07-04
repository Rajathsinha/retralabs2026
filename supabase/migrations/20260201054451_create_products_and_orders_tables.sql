/*
  # Create RetraLabs Database Schema

  ## Overview
  Sets up the core database structure for the RetraLabs peptide research catalog system.

  ## New Tables
  
  ### `products`
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text) - Product name (e.g., "Retatrutide")
  - `description` (text) - Product description
  - `category` (text) - Product category
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `product_variants`
  - `id` (uuid, primary key) - Unique variant identifier
  - `product_id` (uuid, foreign key) - References products table
  - `dosage_mg` (integer) - Dosage amount in milligrams
  - `price_inr` (integer) - Price in Indian Rupees
  - `in_stock` (boolean) - Availability status
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `orders`
  - `id` (uuid, primary key) - Unique order identifier
  - `customer_name` (text) - Customer full name
  - `customer_email` (text) - Customer email address
  - `customer_phone` (text) - Customer phone number
  - `shipping_address` (text) - Full shipping address
  - `total_amount` (integer) - Total order amount in INR
  - `status` (text) - Order status (pending, processing, shipped, delivered)
  - `created_at` (timestamptz) - Order placement timestamp
  
  ### `order_items`
  - `id` (uuid, primary key) - Unique order item identifier
  - `order_id` (uuid, foreign key) - References orders table
  - `product_id` (uuid, foreign key) - References products table
  - `variant_id` (uuid, foreign key) - References product_variants table
  - `quantity` (integer) - Number of units ordered
  - `unit_price` (integer) - Price per unit at time of order
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for products and variants (catalog browsing)
  - Public insert access for orders and order items (checkout)
  - No update/delete access from public (admin only via service role)
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'peptide',
  created_at timestamptz DEFAULT now()
);

-- Create product variants table (for different dosages)
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  dosage_mg integer NOT NULL,
  price_inr integer NOT NULL,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  shipping_address text NOT NULL,
  total_amount integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  variant_id uuid REFERENCES product_variants(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products policies (public read)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon
  USING (true);

-- Product variants policies (public read)
CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT
  TO anon
  USING (true);

-- Orders policies (public insert only)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Order items policies (public insert only)
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (true);

-- Insert initial products
INSERT INTO products (name, description, category) VALUES
  ('Retatrutide', 'High-purity retatrutide peptide for research applications', 'peptide'),
  ('Tirzepatide', 'Research-grade tirzepatide for analytical purposes', 'peptide'),
  ('GHK-Cu', 'Copper peptide complex for laboratory research', 'peptide')
ON CONFLICT DO NOTHING;

-- Insert product variants with dosages and pricing
INSERT INTO product_variants (product_id, dosage_mg, price_inr) 
SELECT 
  (SELECT id FROM products WHERE name = 'Retatrutide'),
  dosage,
  price
FROM (VALUES 
  (20, 7000),
  (50, 13000),
  (100, 21000)
) AS variants(dosage, price)
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, dosage_mg, price_inr)
SELECT 
  (SELECT id FROM products WHERE name = 'Tirzepatide'),
  dosage,
  price
FROM (VALUES 
  (20, 7000),
  (50, 13000)
) AS variants(dosage, price)
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, dosage_mg, price_inr)
SELECT 
  (SELECT id FROM products WHERE name = 'GHK-Cu'),
  dosage,
  price
FROM (VALUES 
  (50, 4000),
  (100, 7000),
  (150, 10000),
  (200, 13000),
  (250, 15600)
) AS variants(dosage, price)
ON CONFLICT DO NOTHING;