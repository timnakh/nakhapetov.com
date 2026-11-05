/**
 * POST /api/interest — demand stub: signed subscriber token + fair-price choice.
 * No payments. Missing MAIL_INTEREST_LIST_ID logs and continues.
 */

import { createMailer } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { verifyInterestToken } from '../lib/token';

interface Env {
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_INTEREST_LIST_ID?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
  TOKEN_SECRET?: string;
  SITE_URL?: string;
}

const PRICE_CHOICES = new Set([
  'under_20',
  '20_40',
  '40_80',
  '80_plus',
  'not_sure',
]);

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location } });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || 'https://nakhapetov.com';
  const ip = clientIp(request);
  const limited = rateLimit(`interest:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return redirect(`${siteUrl}/playbook/early-access?error=rate_limit`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(`${siteUrl}/playbook/early-access?error=invalid`);
  }

  // Honeypot
  const company = String(form.get('company') || '').trim();
  if (company) {
    return redirect(`${siteUrl}/playbook/early-access/thanks`);
  }

  const token = String(form.get('t') || form.get('token') || '').trim();
  const secret = env.TOKEN_SECRET?.trim();
  if (!token || !secret) {
    return redirect(`${siteUrl}/playbook/early-access?error=token`);
  }

  const verified = await verifyInterestToken(token, secret);
  if (!verified) {
    return redirect(`${siteUrl}/playbook/early-access?error=token`);
  }

  const priceChoice = String(form.get('price_choice') || '').trim();
  if (!PRICE_CHOICES.has(priceChoice)) {
    return redirect(
      `${siteUrl}/playbook/early-access?t=${encodeURIComponent(token)}&error=price`,
    );
  }

  const commentRaw = String(form.get('comment') || '');
  const comment = commentRaw.trim().slice(0, 500);
  const hasComment = comment.length > 0;

  const interestListId = env.MAIL_INTEREST_LIST_ID?.trim();
  const mailer = createMailer(env);

  if (!interestListId) {
    console.warn('[interest] interest segment not configured');
  } else {
    try {
      await mailer.addContact({
        email: verified.email,
        audienceId: interestListId,
        properties: {
          price_choice: priceChoice,
          has_comment: hasComment ? '1' : '0',
          ...(hasComment ? { interest_comment: comment } : {}),
        },
      });
    } catch (err) {
      // Contact props may be unsupported on the audience — still log, don't crash the user.
      console.warn('[interest] addContact failed', err instanceof Error ? err.message : err);
    }
  }

  // Comment text never goes to analytics; keep a server-side trail for Tim.
  console.log('[interest] submit', {
    email: verified.email,
    price_choice: priceChoice,
    has_comment: hasComment,
    comment: hasComment ? comment : undefined,
  });

  const thanks = new URL(`${siteUrl}/playbook/early-access/thanks`);
  thanks.searchParams.set('price', priceChoice);
  thanks.searchParams.set('comment', hasComment ? '1' : '0');
  return redirect(thanks.toString());
};
