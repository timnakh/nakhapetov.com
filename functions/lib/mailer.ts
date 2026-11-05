/**
 * Тонкий адаптер почты. Провайдер — Resend; заменить можно без правок эндпоинтов.
 * Без MAIL_PROVIDER_API_KEY работает в dry-run (письма в лог, без отправки).
 */

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface MailContact {
  email: string;
  audienceId: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<{ id: string; dryRun?: boolean }>;
  addContact(contact: MailContact): Promise<{ id: string; dryRun?: boolean }>;
}

type Env = {
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
};

const DEFAULT_FROM = 'Tim Nakhapetov <hello@nakhapetov.com>';
const DEFAULT_REPLY_TO = 'hello@nakhapetov.com';

export function createMailer(env: Env): Mailer {
  const apiKey = env.MAIL_PROVIDER_API_KEY;
  const from = env.MAIL_FROM || DEFAULT_FROM;
  const forceDry = env.MAIL_DRY_RUN === '1' || env.MAIL_DRY_RUN === 'true';

  if (!apiKey || forceDry) {
    return {
      async send(message) {
        console.log('[mailer:dry-run] send', {
          to: message.to,
          subject: message.subject,
          from: message.from || from,
          replyTo: message.replyTo || DEFAULT_REPLY_TO,
        });
        return { id: `dry-${Date.now()}`, dryRun: true };
      },
      async addContact(contact) {
        console.log('[mailer:dry-run] addContact', contact);
        return { id: `dry-contact-${Date.now()}`, dryRun: true };
      },
    };
  }

  return {
    async send(message) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from || from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo || DEFAULT_REPLY_TO,
          headers: message.headers,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend send failed: ${res.status} ${body}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },
    async addContact(contact) {
      const res = await fetch(
        `https://api.resend.com/audiences/${encodeURIComponent(contact.audienceId)}/contacts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contact.email,
            unsubscribed: false,
          }),
        },
      );
      // 409 — контакт уже есть, считаем успехом
      if (!res.ok && res.status !== 409) {
        const body = await res.text();
        throw new Error(`Resend addContact failed: ${res.status} ${body}`);
      }
      const data = res.status === 409 ? { id: 'existing' } : ((await res.json()) as { id: string });
      return { id: data.id };
    },
  };
}

export function unsubscribeFooter(email: string, siteUrl: string): { html: string; text: string } {
  const unsub = `${siteUrl}/privacy#unsubscribe`;
  return {
    html: `<p style="color:#4A463E;font-size:13px;margin-top:32px;">You received this because you asked for the Indie Launch Playbook.<br/><a href="${unsub}">Unsubscribe</a> · <a href="mailto:hello@nakhapetov.com">hello@nakhapetov.com</a></p>`,
    text: `\n\nUnsubscribe: ${unsub}\nContact: hello@nakhapetov.com\n(Requested for: ${email})`,
  };
}
