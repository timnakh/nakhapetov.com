/**
 * POST /api/subscribe — двойной opt-in: письмо с подтверждением, контакт ещё не в списке.
 */

import { createMailer, unsubscribeFooter } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { signConfirmToken } from '../lib/token';
import { verifyTurnstile } from '../lib/turnstile';

interface Env {
  TURNSTILE_SECRET?: string;
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_LIST_ID?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
  TOKEN_SECRET?: string;
  SITE_URL?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location } });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || 'https://nakhapetov.com';
  const ip = clientIp(request);
  const limited = rateLimit(`subscribe:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return redirect(`${siteUrl}/playbook?error=rate_limit`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(`${siteUrl}/playbook?error=invalid`);
  }

  // Honeypot
  const company = String(form.get('company') || '').trim();
  if (company) {
    return redirect(`${siteUrl}/playbook/thanks`);
  }

  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return redirect(`${siteUrl}/playbook?error=email`);
  }

  const turnstileToken =
    String(form.get('cf-turnstile-response') || form.get('turnstile') || '') || null;
  const human = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!human) {
    return redirect(`${siteUrl}/playbook?error=turnstile`);
  }

  const secret = env.TOKEN_SECRET;
  if (!secret) {
    console.error('[subscribe] TOKEN_SECRET is not set');
    return redirect(`${siteUrl}/playbook?error=config`);
  }

  const token = await signConfirmToken(email, secret);
  const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(token)}`;
  const footer = unsubscribeFooter(email, siteUrl);

  const mailer = createMailer(env);
  await mailer.send({
    to: email,
    subject: 'Confirm your email for the Playbook',
    html: `
      <div style="font-family:system-ui,sans-serif;background:#14161F;color:#F4F1EA;padding:32px;">
        <h1 style="font-size:22px;margin:0 0 12px;">Confirm your email</h1>
        <p style="color:#B8BCCB;line-height:1.5;">One click to get the free chapter of the Indie Launch Playbook. This link expires in 48 hours.</p>
        <p style="margin:28px 0;"><a href="${confirmUrl}" style="display:inline-block;background:#E8A33D;color:#14161F;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm email</a></p>
        <p style="color:#B8BCCB;font-size:13px;">Or open this URL:<br/>${confirmUrl}</p>
        ${footer.html}
      </div>
    `,
    text: `Confirm your email for the Playbook\n\nOpen this link within 48 hours:\n${confirmUrl}${footer.text}`,
  });

  return redirect(`${siteUrl}/playbook/check-email`);
};
