/**
 * POST /api/interest — demand stub: signed subscriber token + fair-price choice.
 * No payments. Missing MAIL_INTEREST_LIST_ID logs and continues.
 *
 * On success: Resend contact properties `price_choice` (+ `interest_comment` / `has_comment`
 * when present). If Resend rejects custom props → KV (optional binding) + Functions log.
 */

import { createMailer } from '../lib/mailer';
import { clientIp, rateLimit } from '../lib/rate-limit';
import { verifyInterestToken } from '../lib/token';

interface InterestKv {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_INTEREST_LIST_ID?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
  TOKEN_SECRET?: string;
  SITE_URL?: string;
  /** Optional CF KV for interest fallback when Resend custom props fail. */
  INTEREST_KV?: InterestKv;
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

async function storeInterestFallback(
  env: Env,
  record: {
    email: string;
    price_choice: string;
    has_comment: boolean;
    comment?: string;
    reason: string;
  },
): Promise<void> {
  // Always log (CF Pages Functions logs). Includes email for ops; never emailed onward.
  console.log('[interest] fallback store', {
    email: record.email,
    price_choice: record.price_choice,
    has_comment: record.has_comment,
    comment: record.comment,
    reason: record.reason,
  });

  const kv = env.INTEREST_KV;
  if (!kv) {
    console.warn('[interest] INTEREST_KV not bound — fallback is Functions log only');
    return;
  }

  const key = `interest:${record.email}:${Date.now()}`;
  try {
    await kv.put(
      key,
      JSON.stringify({
        email: record.email,
        price_choice: record.price_choice,
        has_comment: record.has_comment,
        comment: record.comment,
        reason: record.reason,
        at: new Date().toISOString(),
      }),
      { expirationTtl: 90 * 24 * 60 * 60 },
    );
  } catch (err) {
    console.warn('[interest] INTEREST_KV put failed', err instanceof Error ? err.message : err);
  }
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

  const properties: Record<string, string> = {
    price_choice: priceChoice,
    has_comment: hasComment ? '1' : '0',
  };
  if (hasComment) {
    properties.interest_comment = comment;
  }

  const interestListId = env.MAIL_INTEREST_LIST_ID?.trim();
  const mailer = createMailer(env);
  let propertiesApplied = false;

  if (!interestListId) {
    console.warn('[interest] interest segment not configured');
    await storeInterestFallback(env, {
      email: verified.email,
      price_choice: priceChoice,
      has_comment: hasComment,
      comment: hasComment ? comment : undefined,
      reason: 'interest_segment_not_configured',
    });
  } else {
    try {
      const result = await mailer.addContact({
        email: verified.email,
        audienceId: interestListId,
        properties,
      });
      propertiesApplied = result.propertiesApplied !== false;
      if (!propertiesApplied) {
        await storeInterestFallback(env, {
          email: verified.email,
          price_choice: priceChoice,
          has_comment: hasComment,
          comment: hasComment ? comment : undefined,
          reason: 'resend_properties_not_applied',
        });
      }
    } catch (err) {
      console.warn('[interest] addContact failed', err instanceof Error ? err.message : err);
      await storeInterestFallback(env, {
        email: verified.email,
        price_choice: priceChoice,
        has_comment: hasComment,
        comment: hasComment ? comment : undefined,
        reason: 'add_contact_failed',
      });
    }
  }

  console.log('[interest] submit', {
    email: verified.email,
    price_choice: priceChoice,
    has_comment: hasComment,
    comment: hasComment ? comment : undefined,
    properties_applied: propertiesApplied,
  });

  const thanks = new URL(`${siteUrl}/playbook/early-access/thanks`);
  thanks.searchParams.set('price', priceChoice);
  thanks.searchParams.set('comment', hasComment ? '1' : '0');
  return redirect(thanks.toString());
};
