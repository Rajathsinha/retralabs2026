import { parseAddressBlock, parseBulkAddressText, splitBulkText } from '../src/utils/addressParser';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}`);
  }
}

// Test 1: Exact format requested by user
const sample1 = `TO,
Rahul Sharma
Flat 402, Sunshine Apartments, Indiranagar, Bangalore, Karnataka - 560038
9876543210`;

const parsed1 = parseAddressBlock(sample1, { defaultPrice: 1000 });
assert('User Sample 1 Name is Rahul Sharma', parsed1.name === 'Rahul Sharma');
assert('User Sample 1 Phone is 9876543210', parsed1.phone === '9876543210');
assert('User Sample 1 Pincode is 560038', parsed1.pincode === '560038');
assert('User Sample 1 State is Karnataka', parsed1.state === 'Karnataka');
assert('User Sample 1 Price is 1000', parsed1.price === 1000);
assert('User Sample 1 isValid is true', parsed1.isValid === true);

// Test 2: User Bulk Format
const sampleBulk = `TO,
Amit Verma
123 Park Avenue, Sector 15, Gurgaon, Haryana 122001
9876543210


TO,
Pooja Patel
B-201, Green Heights, SG Highway, Ahmedabad, Gujarat 380015
9123456789


TO,
Vikram Singh
House No 45, Civil Lines, Jaipur, Rajasthan 302006
+91 9829012345`;

const bulkParsed = parseBulkAddressText(sampleBulk, { defaultPrice: 3000 });
assert('Bulk parsed 3 items', bulkParsed.length === 3);
assert('Bulk item 1 name is Amit Verma', bulkParsed[0].name === 'Amit Verma');
assert('Bulk item 1 price is 3000', bulkParsed[0].price === 3000);
assert('Bulk item 1 state is Haryana', bulkParsed[0].state === 'Haryana');
assert('Bulk item 1 pincode is 122001', bulkParsed[0].pincode === '122001');

assert('Bulk item 2 name is Pooja Patel', bulkParsed[1].name === 'Pooja Patel');
assert('Bulk item 2 state is Gujarat', bulkParsed[1].state === 'Gujarat');
assert('Bulk item 2 pincode is 380015', bulkParsed[1].pincode === '380015');

assert('Bulk item 3 name is Vikram Singh', bulkParsed[2].name === 'Vikram Singh');
assert('Bulk item 3 phone is 9829012345', bulkParsed[2].phone === '9829012345');
assert('Bulk item 3 state is Rajasthan', bulkParsed[2].state === 'Rajasthan');
assert('Bulk item 3 pincode is 302006', bulkParsed[2].pincode === '302006');

// Test 3: Inline item details
const sampleInline = `TO: Dr. Suresh Reddy
Apollo Hospital Campus, Jubilee Hills, Hyderabad, Telangana 500033
Ph: 9988776655
Item: Retratrutide 5mg vial
Price: 3000
Payment: COD`;

const parsedInline = parseAddressBlock(sampleInline);
assert('Inline Name is Dr. Suresh Reddy', parsedInline.name === 'Dr. Suresh Reddy');
assert('Inline Item is Retratrutide 5mg vial', parsedInline.item === 'Retratrutide 5mg vial');
assert('Inline Price is 3000', parsedInline.price === 3000);
assert('Inline Payment is cod', parsedInline.paymentMethod === 'cod');
assert('Inline Phone is 9988776655', parsedInline.phone === '9988776655');
assert('Inline Pincode is 500033', parsedInline.pincode === '500033');
assert('Inline State is Telangana', parsedInline.state === 'Telangana');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
