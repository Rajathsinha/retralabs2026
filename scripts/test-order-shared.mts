import {
  PAYMENT_SESSION_SECONDS,
  PAYMENT_STATUS,
  isFakeAwb,
  sanitizeAwb,
  isPaymentConfirmed,
  paymentSessionExpiresAt,
  isPaymentSessionExpired,
} from '../functions/order-shared';

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

assert('PAYMENT_SESSION_SECONDS is 300', PAYMENT_SESSION_SECONDS === 300);

assert('detects legacy fake AWB', isFakeAwb('RETRA-20260905-1430'));
assert('does not flag real AWB', !isFakeAwb('12345678901234'));
assert('does not flag RETR document number', !isFakeAwb('RETR0000000035'));

assert('sanitizeAwb clears fake AWB', sanitizeAwb('RETRA-20260905-1430') === undefined);
assert('sanitizeAwb keeps real AWB', sanitizeAwb('98765432109876') === '98765432109876');

assert('UPI pending is not confirmed', !isPaymentConfirmed(PAYMENT_STATUS.PENDING, 'UPI QR'));
assert('confirmed status is confirmed', isPaymentConfirmed(PAYMENT_STATUS.CONFIRMED, 'UPI QR'));
assert('COD is confirmed without status', isPaymentConfirmed('', 'COD'));

const startedAt = '2026-09-05T12:00:00.000Z';
const expiresMs = paymentSessionExpiresAt(startedAt);
assert('payment session is 300s after start', expiresMs === new Date(startedAt).getTime() + 300_000);

const futureExpiry = new Date(Date.now() + 60_000).toISOString();
const pastExpiry = new Date(Date.now() - 60_000).toISOString();
assert('future session not expired', !isPaymentSessionExpired(futureExpiry));
assert('past session expired', isPaymentSessionExpired(pastExpiry));
assert('missing expiry treated as expired', isPaymentSessionExpired(undefined));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
