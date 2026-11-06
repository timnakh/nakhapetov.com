/**
 * POST /api/early-access — enumeration-safe gate for the demand form.
 * - Confirmed subscriber (on MAIL_LIST_ID) → email with /playbook/early-access?t= (48h TTL)
 * - Anyone else → no mail
 * - Same redirect/response either way (no open-by-typing-email, no status leak)
 */

import { createMailer, unsubscribeFooter } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { signInterestToken } from '../lib/token';
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

/** Identical for subscribed and unknown addresses. */
function sentRedirect(siteUrl: string): Response {
  return redirect(`${siteUrl}/playbook/early-access?sent=1`);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || 'https://nakhapetov.com';
  const back = `${siteUrl}/playbook/early-access`;
  const ip = clientIp(request);

  const ipLimited = rateLimit(`early-access:ip:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimited.ok) {
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
    return sentRedirect(siteUrl);
  }

  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return redirect(`${back}?error=email`);
  }

  const emailLimited = rateLimit(`early-access:email:${email}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!emailLimited.ok) {
    return redirect(`${back}?error=rate_limit`);
  }

  const turnstileToken =
    String(form.get('cf-turnstile-response') || form.get('turnstile') || '') || null;
  const human = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!human) {
    return redirect(`${back}?error=turnstile`);
  }

  const secret = env.TOKEN_SECRET?.trim();
  if (!secret) {
    console.error('[early-access] TOKEN_SECRET is not set');
    return redirect(`${back}?error=config`);
  }

  const audienceId = env.MAIL_LIST_ID?.trim();
  if (!audienceId) {
    console.warn('[early-access] MAIL_LIST_ID missing — cannot detect existing contacts');
    return sentRedirect(siteUrl);
  }

  let existing = false;
  try {
    const mailer = createMailer(env);
    existing = Boolean(await mailer.getContact({ email, audienceId }));
  } catch (err) {
    console.warn(
      '[early-access] getContact failed — no mail sent',
      err instanceof Error ? err.message : err,
    );
    return sentRedirect(siteUrl);
  }

  if (existing) {
    const interestToken = await signInterestToken(email, secret);
    const earlyAccessUrl = `${siteUrl}/playbook/early-access?t=${encodeURIComponent(interestToken)}`;
    const footer = unsubscribeFooter(email, siteUrl);
    const mailer = createMailer(env);

    await mailer.send({
      to: email,
      subject: 'Your early-access link for the Playbook',
      replyTo: 'hello@nakhapetov.com',
      html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;max-width:560px;line-height:1.55;font-size:16px;">
        <p style="margin:0 0 1em;">Here is your link to the early-access demand form for the Indie Launch Playbook. It expires in 48 hours.</p>
        <p style="margin:0 0 1em;"><a href="${earlyAccessUrl}" style="color:#111111;text-decoration:underline;">Open the demand form</a></p>
        <p style="margin:0 0 1em;">No purchase on that page — it only asks what feels like a fair price.</p>
        <p style="margin:0 0 1em;">Tim</p>
        ${footer.html}
      </div>
    `,
      text: `Your early-access link for the Playbook\n\nHere is your link to the early-access demand form for the Indie Launch Playbook. It expires in 48 hours.\n\nOpen the demand form:\n${earlyAccessUrl}\n\nNo purchase on that page — it only asks what feels like a fair price.\n\nTim${footer.text}`,
    });
  }

  return sentRedirect(siteUrl);
};
