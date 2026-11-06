/**
 * HMAC subscriber token: email + timestamp.
 * Format: base64url(email + '.' + ts) + '.' + hex(hmac-sha256)
 *
 * Confirm links: 48h. Early-access / interest links: 48h (same payload shape).
 * Free chapter links: 30 days (same payload shape, longer TTL on verify).
 * Important: email may contain dots — parse timestamp from the last '.' of the payload.
 */

export const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
export const INTEREST_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
export const CHAPTER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncodeUtf8(text: string): string {
  const b64 = btoa(text);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeUtf8(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signConfirmToken(email: string, secret: string, now = Date.now()): Promise<string> {
  const payload = `${email.toLowerCase()}.${now}`;
  const key = await importKey(secret.trim());
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${base64UrlEncodeUtf8(payload)}.${toHex(sig)}`;
}

export async function verifyConfirmToken(
  token: string,
  secret: string,
  now = Date.now(),
  ttlMs = CONFIRM_TOKEN_TTL_MS,
): Promise<{ email: string } | null> {
  try {
    const trimmed = token.trim();
    const dot = trimmed.lastIndexOf('.');
    if (dot <= 0 || dot === trimmed.length - 1) return null;

    const payloadB64url = trimmed.slice(0, dot);
    const sigHex = trimmed.slice(dot + 1).toLowerCase();
    if (!/^[0-9a-f]+$/.test(sigHex) || sigHex.length % 2 !== 0) return null;

    const payload = base64UrlDecodeUtf8(payloadB64url);
    const tsSep = payload.lastIndexOf('.');
    if (tsSep <= 0) return null;
    const email = payload.slice(0, tsSep).toLowerCase();
    const ts = Number(payload.slice(tsSep + 1));
    if (!email || !Number.isFinite(ts)) return null;
    if (now - ts > ttlMs || ts > now + 60_000) return null;

    const key = await importKey(secret.trim());
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromHex(sigHex),
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;
    return { email };
  } catch {
    return null;
  }
}

/** Same HMAC shape as confirm; verified with the interest TTL (48h). */
export async function verifyInterestToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<{ email: string } | null> {
  return verifyConfirmToken(token, secret, now, INTEREST_TOKEN_TTL_MS);
}

/** Same HMAC shape as confirm; verified with the chapter TTL (30 days). */
export async function verifyChapterToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<{ email: string } | null> {
  return verifyConfirmToken(token, secret, now, CHAPTER_TOKEN_TTL_MS);
}

export const signInterestToken = signConfirmToken;
export const signChapterToken = signConfirmToken;
