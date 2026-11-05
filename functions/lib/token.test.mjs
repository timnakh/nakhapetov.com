/**
 * Node smoke test for confirm token round-trip (no secrets logged).
 * Run: node functions/lib/token.test.mjs
 */
import { signConfirmToken, verifyConfirmToken } from './token.ts';

const secret = 'unit-test-secret';
const emails = ['you@example.com', 'a@b.co', 'tim@nakhapetov.com', 'user+tag@mail.example.org'];

let failed = 0;
for (const email of emails) {
  const token = await signConfirmToken(email, secret);
  const parts = token.split('.');
  if (parts.length !== 2) {
    console.error('FAIL parts', email);
    failed++;
    continue;
  }
  const ok = await verifyConfirmToken(token, secret);
  if (!ok || ok.email !== email.toLowerCase()) {
    console.error('FAIL verify', email);
    failed++;
    continue;
  }
  // URL round-trip
  const encoded = encodeURIComponent(token);
  const decoded = new URL(`https://x.test/api/confirm?token=${encoded}`).searchParams.get('token');
  const ok2 = await verifyConfirmToken(decoded, secret);
  if (!ok2 || ok2.email !== email.toLowerCase()) {
    console.error('FAIL url', email);
    failed++;
    continue;
  }
  // Expired
  const old = await signConfirmToken(email, secret, Date.now() - 49 * 60 * 60 * 1000);
  if (await verifyConfirmToken(old, secret)) {
    console.error('FAIL expiry', email);
    failed++;
    continue;
  }
  console.log('ok', email, 'tokenLen', token.length);
}

if (failed) {
  console.error('failed', failed);
  process.exit(1);
}
console.log('all passed');
