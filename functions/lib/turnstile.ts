/**
 * Проверка Cloudflare Turnstile. Без секрета в dev — пропускаем с предупреждением.
 */

export async function verifyTurnstile(
  token: string | null,
  secret: string | undefined,
  ip: string,
): Promise<boolean> {
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET missing — skipping verification');
    return true;
  }
  if (!token) return false;

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}
