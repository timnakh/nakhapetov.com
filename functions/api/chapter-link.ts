/**
 * POST /api/chapter-link — enumeration-safe "Resend my link" for the free chapter.
 * - Confirmed subscriber (on MAIL_LIST_ID) → email with /playbook/chapter-1?t= (30d TTL)
 * - Anyone else → no mail
 * - Same redirect/response either way
 */

import { createMailer, unsubscribeFooter } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { signChapterToken } from '../lib/token';
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
  return redirect(`${siteUrl}/playbook?sent=1#subscribe`);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || 'https://nakhapetov.com';
  const back = `${siteUrl}/playbook`;
  const ip = clientIp(request);

  const ipLimited = rateLimit(`chapter-link:ip:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimited.ok) {
    return redirect(`${back}?error=rate_limit#subscribe`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(`${back}?error=invalid#subscribe`);
  }

  const company = String(form.get('company') || '').trim();
  if (company) {
    return sentRedirect(siteUrl);
  }

  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return redirect(`${back}?error=email#subscribe`);
  }

  const emailLimited = rateLimit(`chapter-link:email:${email}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!emailLimited.ok) {
    return redirect(`${back}?error=rate_limit#subscribe`);
  }

  const turnstileToken =
    String(form.get('cf-turnstile-response') || form.get('turnstile') || '') || null;
  const human = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
  if (!human) {
    return redirect(`${back}?error=turnstile#subscribe`);
  }

  const secret = env.TOKEN_SECRET?.trim();
  if (!secret) {
    console.error('[chapter-link] TOKEN_SECRET is not set');
    return redirect(`${back}?error=config#subscribe`);
  }

  const audienceId = env.MAIL_LIST_ID?.trim();
  if (!audienceId) {
    console.warn('[chapter-link] MAIL_LIST_ID missing — cannot detect existing contacts');
    return sentRedirect(siteUrl);
  }

  let existing = false;
  try {
    const mailer = createMailer(env);
    existing = Boolean(await mailer.getContact({ email, audienceId }));
  } catch (err) {
    console.warn(
      '[chapter-link] getContact failed — no mail sent',
      err instanceof Error ? err.message : err,
    );
    return sentRedirect(siteUrl);
  }

  if (existing) {
    const chapterToken = await signChapterToken(email, secret);
    const chapterUrl = `${siteUrl}/playbook/chapter-1?t=${encodeURIComponent(chapterToken)}`;
    const footer = unsubscribeFooter(email, siteUrl);
    const mailer = createMailer(env);

    await mailer.send({
      to: email,
      subject: 'Your free chapter link',
      replyTo: 'hello@nakhapetov.com',
      html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;max-width:560px;line-height:1.55;font-size:16px;">
        <p style="margin:0 0 1em;">Here is your link to the free chapter of the Indie Launch Playbook — <em>Identity and entity</em>. It expires in 30 days.</p>
        <p style="margin:0 0 1em;"><a href="${chapterUrl}" style="color:#111111;text-decoration:underline;">Read the free chapter</a></p>
        <p style="margin:0 0 1em;">Tim</p>
        ${footer.html}
      </div>
    `,
      text: `Your free chapter link\n\nHere is your link to the free chapter of the Indie Launch Playbook — Identity and entity. It expires in 30 days.\n\nRead the free chapter:\n${chapterUrl}\n\nTim${footer.text}`,
    });
  }

  return sentRedirect(siteUrl);
};
