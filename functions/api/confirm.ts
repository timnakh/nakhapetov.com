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
  if (audienceId) {
    await mailer.addContact({ email: verified.email, audienceId });
  } else {
    console.warn('[confirm] MAIL_LIST_ID missing — contact not added to audience');
  }

  const chapterUrl = `${siteUrl}/playbook/chapter-1`;
  const footer = unsubscribeFooter(verified.email, siteUrl);

  await mailer.send({
    to: verified.email,
    subject: 'Your free chapter of the Indie Launch Playbook',
    html: `
      <div style="font-family:system-ui,sans-serif;background:#14161F;color:#F4F1EA;padding:32px;">
        <h1 style="font-size:22px;margin:0 0 12px;">Here's your free chapter</h1>
        <p style="color:#B8BCCB;line-height:1.5;">Thanks for confirming. Read the free chapter online — and you'll get one more email when the full edition is ready.</p>
        <p style="margin:28px 0;"><a href="${chapterUrl}" style="display:inline-block;background:#E8A33D;color:#14161F;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Read the free chapter</a></p>
        ${footer.html}
      </div>
    `,
    text: `Here's your free chapter of the Indie Launch Playbook\n\nRead it here: ${chapterUrl}${footer.text}`,
  });

  return redirect(`${siteUrl}/playbook/thanks`);
};
