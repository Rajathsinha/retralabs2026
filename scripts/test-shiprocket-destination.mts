/**
 * Checks resolveDestination against the real addresses of the orders that were
 * stuck in "Logistics Failed", including the older ones that predate the
 * Order Snapshot field and must be recovered from the address text alone.
 */
import { resolveDestination } from '../functions/shiprocket-shared';

interface Case {
  label: string;
  fields: Record<string, unknown>;
  expect: { city: string; state: string; pincode: string; source: string };
}

const cases: Case[] = [
  {
    label: '20261101010 Shaadaab (snapshot present)',
    fields: {
      orderID: '20261101010',
      Address: 'La vision towar shepherd road 133 Mirza Galib Road Ashadham Colony Byculla, 2802, Mumbai, Maharashtra, India - PIN: 400008',
      'Order Snapshot': '{"v":1,"city":"Mumbai","state":"Maharashtra","pincode":"400008"}',
    },
    expect: { city: 'Mumbai', state: 'Maharashtra', pincode: '400008', source: 'snapshot' },
  },
  {
    label: '20260914014 Sreyas (no snapshot, Kerala)',
    fields: {
      orderID: '20260914014',
      Address: 'Swamies Milk Products, Korangad, Thamarassery, Kozhikode, Kerala - 673573',
    },
    expect: { city: 'Kozhikode', state: 'Kerala', pincode: '673573', source: 'address' },
  },
  {
    label: '20260918009 Madhu (no snapshot, UP)',
    fields: {
      orderID: '20260918009',
      Address: '263, Shamli road, gaushala, nadi road Dr Manju Dutta nivas, Muzaffarnagar, Uttar Pradesh - 251002',
    },
    expect: { city: 'Muzaffarnagar', state: 'Uttar Pradesh', pincode: '251002', source: 'address' },
  },
  {
    label: '20261025010 Atul (snapshot, Nashik)',
    fields: {
      orderID: '20261025010',
      Address: 'E604, ABH Treeland Gangapur Road Jalapur, Nashik, Maharashtra, India - PIN: 422222',
      'Order Snapshot': '{"v":1,"city":"Nashik","state":"Maharashtra","pincode":"422222"}',
    },
    expect: { city: 'Nashik', state: 'Maharashtra', pincode: '422222', source: 'snapshot' },
  },
  {
    label: 'address ending in ", India" with no snapshot',
    fields: {
      orderID: 'TEST-INDIA-SUFFIX',
      Address: 'Flat 9, Some Road, Pune, Maharashtra, India - PIN: 411048',
    },
    expect: { city: 'Pune', state: 'Maharashtra', pincode: '411048', source: 'address' },
  },
  {
    label: 'malformed snapshot falls back to the address',
    fields: {
      orderID: 'TEST-BAD-SNAPSHOT',
      Address: 'X Road, Gurgaon, Haryana - 122103',
      'Order Snapshot': '{not json',
    },
    expect: { city: 'Gurgaon', state: 'Haryana', pincode: '122103', source: 'address' },
  },
];

let failures = 0;
for (const c of cases) {
  try {
    const got = resolveDestination(c.fields);
    const ok =
      got.city === c.expect.city &&
      got.state === c.expect.state &&
      got.pincode === c.expect.pincode &&
      got.source === c.expect.source;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label}`);
    if (!ok) {
      failures++;
      console.log(`        expected ${JSON.stringify(c.expect)}`);
      console.log(`        got      ${JSON.stringify(got)}`);
    }
  } catch (err) {
    failures++;
    console.log(`FAIL  ${c.label}\n        threw: ${err instanceof Error ? err.message : err}`);
  }
}

// An address with no recoverable state must throw, not silently pick a city.
try {
  resolveDestination({ orderID: 'TEST-JUNK', Address: 'somewhere nice 999999' });
  failures++;
  console.log('FAIL  unrecoverable address should throw, but returned a value');
} catch {
  console.log('PASS  unrecoverable address throws instead of guessing');
}

console.log(failures === 0 ? '\nAll destination cases passed.' : `\n${failures} failing case(s).`);
process.exit(failures === 0 ? 0 : 1);
