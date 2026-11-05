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

  if (!token || !env.TOKEN_SECRET) {
    return redirect(`${siteUrl}/playbook?error=token`);
  }

  const verified = await verifyConfirmToken(token, env.TOKEN_SECRET);
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
    subject: 'Chapter 1: Identity and entity',
    replyTo: 'hello@nakhapetov.com',
    html: `
      <div style="font-family:Georgia,serif;background:#F2EFE8;color:#111111;padding:32px;max-width:560px;">
        <h1 style="font-size:22px;margin:0 0 12px;font-weight:400;">Chapter 1: Identity and entity</h1>
        <p style="color:#4A463E;line-height:1.55;">Thanks for confirming. Your free chapter is ready.</p>
        <p style="margin:28px 0;"><a href="${chapterUrl}" style="display:inline-block;background:#1F3BFF;color:#ffffff;padding:12px 20px;text-decoration:none;">Read the free chapter</a></p>
        <p style="color:#4A463E;line-height:1.55;">Reply to this email if something looks outdated.</p>
        ${footer.html}
      </div>
    `,
    text: `Chapter 1: Identity and entity\n\nRead it here: ${chapterUrl}\n\nReply to this email if something looks outdated.${footer.text}`,
  });

  if (already) {
    // Still send the chapter; land on thanks without a technical error.
    return redirect(`${siteUrl}/playbook/thanks`);
  }

  return redirect(`${siteUrl}/playbook/thanks`);
};
