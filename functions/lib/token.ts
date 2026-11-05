/**
 * HMAC-токен подтверждения: email + timestamp, срок 48 часов.
 */

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

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
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const token = `${btoa(payload)}.${toHex(sig)}`;
  return token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifyConfirmToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<{ email: string } | null> {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const raw = normalized + pad;
    const [payloadB64, sigHex] = raw.split('.');
    if (!payloadB64 || !sigHex) return null;
    const payload = atob(payloadB64);
    const [email, tsStr] = payload.split('.');
    const ts = Number(tsStr);
    if (!email || !Number.isFinite(ts)) return null;
    if (now - ts > TOKEN_TTL_MS || ts > now + 60_000) return null;

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromHex(sigHex),
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;
    return { email: email.toLowerCase() };
  } catch {
    return null;
  }
}
