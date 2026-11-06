/**
 * Node smoke test for confirm / interest token round-trip (no secrets logged).
 * Run: node functions/lib/token.test.mjs
 */
import {
  CHAPTER_TOKEN_TTL_MS,
  CONFIRM_TOKEN_TTL_MS,
  INTEREST_TOKEN_TTL_MS,
  signChapterToken,
  signConfirmToken,
  signInterestToken,
  verifyChapterToken,
  verifyConfirmToken,
  verifyInterestToken,
} from './token.ts';

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
  // Confirm expired after 48h
  const old = await signConfirmToken(email, secret, Date.now() - CONFIRM_TOKEN_TTL_MS - 60_000);
  if (await verifyConfirmToken(old, secret)) {
    console.error('FAIL expiry', email);
    failed++;
    continue;
  }
  // Interest accepts tokens within 48h
  const fresh = await signInterestToken(email, secret, Date.now() - 60 * 60 * 1000);
  const interestOk = await verifyInterestToken(fresh, secret);
  if (!interestOk || interestOk.email !== email.toLowerCase()) {
    console.error('FAIL interest', email);
    failed++;
    continue;
  }
  const tooOld = await signInterestToken(email, secret, Date.now() - INTEREST_TOKEN_TTL_MS - 60_000);
  if (await verifyInterestToken(tooOld, secret)) {
    console.error('FAIL interest expiry', email);
    failed++;
    continue;
  }
  // Chapter accepts tokens within 30d (including ones past interest TTL)
  const chapterFresh = await signChapterToken(email, secret);
  const chapterOk = await verifyChapterToken(chapterFresh, secret);
  if (!chapterOk || chapterOk.email !== email.toLowerCase()) {
    console.error('FAIL chapter', email);
    failed++;
    continue;
  }
  const pastInterest = await signChapterToken(
    email,
    secret,
    Date.now() - INTEREST_TOKEN_TTL_MS - 60_000,
  );
  if (!(await verifyChapterToken(pastInterest, secret))) {
    console.error('FAIL chapter still valid after interest TTL', email);
    failed++;
    continue;
  }
  if (await verifyInterestToken(pastInterest, secret)) {
    console.error('FAIL interest should reject past-48h chapter token', email);
    failed++;
    continue;
  }
  const chapterExpired = await signChapterToken(
    email,
    secret,
    Date.now() - CHAPTER_TOKEN_TTL_MS - 60_000,
  );
  if (await verifyChapterToken(chapterExpired, secret)) {
    console.error('FAIL chapter expiry', email);
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
