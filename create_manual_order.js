import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Simple polyfill to load .env variables manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
try {
  const envPath = join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  // ignore
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be in your .env file!');
    process.exit(1);
  }

  console.log('📦 --- Shiprocket Quick Manual Order --- 📦');
  console.log('Provide just 4 details, and we will handle the rest!\n');
  
  const customerName = await question('1. Customer Full Name: ');
  const rawAddress = await question('2. Address (MUST include 6-digit Pincode): ');
  const itemName = await question('3. Item Name: ');
  const price = await question('4. Total Price: ');

  rl.close();

  // Extract a 6-digit pincode from the address
  const pincodeMatch = rawAddress.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : null;

  if (!pincode) {
    console.error('\n❌ Error: Could not find a 6-digit pincode in the address. Shiprocket requires a pincode.');
    process.exit(1);
  }

  console.log(`\n🔍 Found Pincode: ${pincode}`);
  console.log('🔄 Fetching City and State from Pincode...');

  let city = 'Unknown City';
  let state = 'Unknown State';
  
  try {
    const pinRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const pinData = await pinRes.json();
    if (pinData && pinData[0] && pinData[0].Status === 'Success' && pinData[0].PostOffice.length > 0) {
      city = pinData[0].PostOffice[0].District || pinData[0].PostOffice[0].Block;
      state = pinData[0].PostOffice[0].State;
      console.log(`✅ Identified Location: ${city}, ${state}`);
    } else {
      console.warn(`⚠️ Warning: Could not find city/state for pincode ${pincode}, using fallbacks.`);
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Pincode lookup failed, using fallbacks.`);
  }

  const parsedPrice = parseFloat(price) || 0;
  const amount = parsedPrice >= 10000 ? 3000 : 1000;

  console.log('🔄 Authenticating with Shiprocket...');
  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const authJson = await authRes.json();
  
  if (!authJson.token) {
    console.error('❌ Failed to authenticate:', authJson);
    process.exit(1);
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const payload = {
    order_id: `MANUAL-${Date.now()}`,
    order_date: orderDate,
    pickup_location: 'Rajath', // Hardcoded as per your Shiprocket setup
    channel_id: '',
    comment: 'Quick Manual Order via CLI',
    billing_customer_name: customerName || 'Customer',
    billing_last_name: '',
    billing_address: rawAddress,
    billing_city: city,
    billing_pincode: pincode,
    billing_state: state,
    billing_country: 'India',
    billing_email: 'manual@retralabs.in',     // Generic fallback
    billing_phone: '9999999999',              // Generic fallback (requires 10 digits)
    shipping_is_billing: true,
    order_items: [
      {
        name: itemName || 'Item',
        sku: 'MANUAL-ITEM',
        units: 1,
        selling_price: amount,
        discount: 0,
        tax: 0,
      },
    ],
    payment_method: 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: amount,
    length: 10,
    breadth: 10,
    height: 5,
    weight: 0.5,
  };

  console.log('\n🚀 Creating Order in Shiprocket...');
  const createRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authJson.token}`,
    },
    body: JSON.stringify(payload),
  });

  const createJson = await createRes.json();
  if (createRes.ok && createJson.status_code === 1) {
    console.log(`✅ Success! Order created.`);
    console.log(`📦 AWB Number: ${createJson.awb_code || 'Pending (Check Dashboard)'}`);
    console.log(`🔗 Order ID: ${createJson.order_id}`);
    console.log(`🚢 Shipment ID: ${createJson.shipment_id}`);
  } else {
    console.error('❌ Failed to create order:', JSON.stringify(createJson, null, 2));
  }
}

main().catch(console.error);
