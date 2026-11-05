/**
 * POST /api/early-access — gate for demand form without a second free-chapter funnel.
 * - Already on MAIL_LIST_ID → mint subscriber token, redirect to /playbook/early-access?t=
 * - New email → one confirm email (same as subscribe); welcome + thanks carry ?t=
 */

import { createMailer, unsubscribeFooter } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { signConfirmToken, signInterestToken } from '../lib/token';
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
  const back = `${siteUrl}/playbook/early-access`;
  const ip = clientIp(request);
  const limited = rateLimit(`early-access:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return redirect(`${back}?error=rate_limit`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(`${back}?error=invalid`);
  }

  const company = String(form.get('company') || '').trim();
  if (company) {
    return redirect(`${siteUrl}/playbook/thanks`);
  }

  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return redirect(`${back}?error=email&email=${encodeURIComponent(email)}`);
  }

  const turnstileToken =
    String(form.get('cf-turnstile-response') || form.get('turnstile') || '') || null;
  const human = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!human) {
    return redirect(`${back}?error=turnstile&email=${encodeURIComponent(email)}`);
  }

  const secret = env.TOKEN_SECRET?.trim();
  if (!secret) {
    console.error('[early-access] TOKEN_SECRET is not set');
    return redirect(`${back}?error=config`);
  }

  const mailer = createMailer(env);
  const audienceId = env.MAIL_LIST_ID?.trim();

  if (audienceId) {
    try {
      const existing = await mailer.getContact({ email, audienceId });
      if (existing) {
        const interestToken = await signInterestToken(email, secret);
        return redirect(`${back}?t=${encodeURIComponent(interestToken)}`);
      }
    } catch (err) {
      console.warn(
        '[early-access] getContact failed — falling back to confirm',
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.warn('[early-access] MAIL_LIST_ID missing — cannot detect existing contacts');
  }

  // New subscriber: one confirm email (welcome + thanks will include ?t=).
  const confirmToken = await signConfirmToken(email, secret);
  const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(confirmToken)}`;
  const footer = unsubscribeFooter(email, siteUrl);

  await mailer.send({
    to: email,
    subject: 'Confirm your email for the Playbook',
    replyTo: 'hello@nakhapetov.com',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;max-width:560px;line-height:1.55;font-size:16px;">
        <p style="margin:0 0 1em;">One click to confirm your email for the Indie Launch Playbook. This link expires in 48 hours.</p>
        <p style="margin:0 0 1em;"><a href="${confirmUrl}" style="color:#111111;text-decoration:underline;">Confirm email</a></p>
        <p style="margin:0 0 1em;">Tim</p>
        ${footer.html}
      </div>
    `,
    text: `Confirm your email for the Playbook\n\nOne click to confirm your email for the Indie Launch Playbook. This link expires in 48 hours.\n\nConfirm email:\n${confirmUrl}\n\nTim${footer.text}`,
  });

  return redirect(`${siteUrl}/playbook/check-email`);
};
