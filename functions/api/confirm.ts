/**
 * GET /api/confirm?token=… — проверка HMAC, добавление контакта, письмо с главой, редирект на thanks.
 */

import { createMailer, unsubscribeFooter } from '../lib/mailer';
import { verifyConfirmToken } from '../lib/token';

interface Env {
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_LIST_ID?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
  TOKEN_SECRET?: string;
  SITE_URL?: string;
}

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location } });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || 'https://nakhapetov.com';
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  const secret = env.TOKEN_SECRET?.trim();
  if (!token || !secret) {
    return redirect(`${siteUrl}/playbook?error=token`);
  }

  const verified = await verifyConfirmToken(token, secret);
  if (!verified) {
    return redirect(`${siteUrl}/playbook?error=token`);
  }

  const mailer = createMailer(env);
  const audienceId = env.MAIL_LIST_ID;
  let already = false;
  if (audienceId) {
    const result = await mailer.addContact({ email: verified.email, audienceId });
    already = result.id === 'existing';
  } else {
    console.warn('[confirm] MAIL_LIST_ID missing — contact not added to audience');
  }

  const chapterUrl = `${siteUrl}/playbook/chapter-1`;
  const footer = unsubscribeFooter(verified.email, siteUrl);

  await mailer.send({
    to: verified.email,
    subject: 'Your free chapter: Identity and entity',
    replyTo: 'hello@nakhapetov.com',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111111;max-width:560px;line-height:1.55;font-size:16px;">
        <p style="margin:0 0 1em;">Thanks for confirming. Your free chapter of the Indie Launch Playbook is ready — <em>Identity and entity</em>, the first step of the route.</p>
        <p style="margin:0 0 1em;">Read it here: <a href="${chapterUrl}" style="color:#111111;text-decoration:underline;">${chapterUrl}</a><br/><br/>I'll write again when the full edition ships. Reply anytime if something looks outdated.</p>
        <p style="margin:0 0 1em;">Tim</p>
        ${footer.html}
      </div>
    `,
    text: `Your free chapter: Identity and entity\n\nThanks for confirming. Your free chapter of the Indie Launch Playbook is ready — Identity and entity, the first step of the route.\n\nRead it here: ${chapterUrl}\n\nI'll write again when the full edition ships. Reply anytime if something looks outdated.\n\nTim${footer.text}`,
  });

  if (already) {
    // Still send the chapter; land on thanks without a technical error.
    return redirect(`${siteUrl}/playbook/thanks`);
  }

  return redirect(`${siteUrl}/playbook/thanks`);
};
