/**
 * Тонкий адаптер почты. Провайдер — Resend; заменить можно без правок эндпоинтов.
 * Без MAIL_PROVIDER_API_KEY работает в dry-run (письма в лог, без отправки).
 *
 * Contacts: modern global Contacts API (POST /contacts + segments + properties).
 * Custom properties must be pre-defined in Resend; we ensure keys via Contact Properties API.
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
  /** Resend Segment / Audience id (`MAIL_LIST_ID` / `MAIL_INTEREST_LIST_ID`). */
  audienceId: string;
  /** Optional Resend contact fields (first/last name). Custom props go in `properties`. */
  firstName?: string;
  lastName?: string;
  properties?: Record<string, string>;
}

export interface AddContactResult {
  id: string;
  dryRun?: boolean;
  /** False when Resend rejected/ignored custom properties (caller should fall back). */
  propertiesApplied?: boolean;
}

export interface Mailer {
  send(message: MailMessage): Promise<{ id: string; dryRun?: boolean }>;
  addContact(contact: MailContact): Promise<AddContactResult>;
  /** Returns contact id if present in the audience; null if missing / unknown. */
  getContact(contact: Pick<MailContact, 'email' | 'audienceId'>): Promise<{ id: string } | null>;
}

type Env = {
  MAIL_PROVIDER_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_DRY_RUN?: string;
};

const DEFAULT_FROM = 'Tim Nakhapetov <hello@nakhapetov.com>';
const DEFAULT_REPLY_TO = 'hello@nakhapetov.com';

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function isConflictStatus(status: number): boolean {
  return status === 409 || status === 422;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function looksLikePropertyError(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes('propert') ||
    lower.includes('unknown key') ||
    lower.includes('invalid key') ||
    lower.includes('does not exist')
  );
}

/** Best-effort: create string contact-property keys if missing (409/422 = already exists). */
async function ensureContactPropertyKeys(apiKey: string, keys: string[]): Promise<void> {
  for (const key of keys) {
    const res = await fetch('https://api.resend.com/contact-properties', {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({ key, type: 'string' }),
    });
    if (res.ok || isConflictStatus(res.status)) {
      if (!res.ok) await res.text().catch(() => undefined);
      continue;
    }
    const body = await readErrorBody(res);
    // Non-fatal — create/update may still succeed if keys already exist.
    console.warn('[mailer] ensure contact property failed', key, res.status, body.slice(0, 200));
  }
}

async function patchContactProperties(
  apiKey: string,
  email: string,
  properties: Record<string, string>,
): Promise<Response> {
  return fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ properties }),
  });
}

async function addContactToSegment(apiKey: string, email: string, segmentId: string): Promise<Response> {
  return fetch(
    `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
    {
      method: 'POST',
      headers: authHeaders(apiKey),
    },
  );
}

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
        console.log('[mailer:dry-run] addContact', {
          email: contact.email,
          audienceId: contact.audienceId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          properties: contact.properties,
        });
        return {
          id: `dry-contact-${Date.now()}`,
          dryRun: true,
          propertiesApplied: Boolean(contact.properties && Object.keys(contact.properties).length),
        };
      },
      async getContact(contact) {
        console.log('[mailer:dry-run] getContact', {
          email: contact.email,
          audienceId: contact.audienceId,
        });
        return null;
      },
    };
  }

  return {
    async send(message) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: authHeaders(apiKey),
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
        const body = await readErrorBody(res);
        throw new Error(`Resend send failed: ${res.status} ${body}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },

    async addContact(contact) {
      const props = contact.properties;
      const hasProps = Boolean(props && Object.keys(props).length);

      if (hasProps && props) {
        await ensureContactPropertyKeys(apiKey, Object.keys(props));
      }

      const createPayload: Record<string, unknown> = {
        email: contact.email,
        unsubscribed: false,
        segments: [{ id: contact.audienceId }],
      };
      if (contact.firstName) createPayload.first_name = contact.firstName;
      if (contact.lastName) createPayload.last_name = contact.lastName;
      if (hasProps && props) createPayload.properties = props;

      const createRes = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify(createPayload),
      });

      if (createRes.ok) {
        const data = (await createRes.json()) as { id: string };
        return { id: data.id, propertiesApplied: hasProps };
      }

      const createBody = await readErrorBody(createRes);

      // Contact already exists → update properties + ensure segment membership.
      if (isConflictStatus(createRes.status) || createBody.toLowerCase().includes('already')) {
        let propertiesApplied = !hasProps;

        if (hasProps && props) {
          const patchRes = await patchContactProperties(apiKey, contact.email, props);
          if (patchRes.ok) {
            propertiesApplied = true;
            await patchRes.text().catch(() => undefined);
          } else {
            const patchBody = await readErrorBody(patchRes);
            console.warn(
              '[mailer] patch contact properties failed',
              patchRes.status,
              patchBody.slice(0, 300),
            );
            propertiesApplied = false;
          }
        }

        const segRes = await addContactToSegment(apiKey, contact.email, contact.audienceId);
        // 409 / already in segment is fine
        if (!segRes.ok && !isConflictStatus(segRes.status)) {
          const segBody = await readErrorBody(segRes);
          // Fall through to legacy audience path below if segment add fails.
          console.warn('[mailer] add to segment failed', segRes.status, segBody.slice(0, 300));
        } else {
          if (!segRes.ok) await segRes.text().catch(() => undefined);
          return { id: 'existing', propertiesApplied };
        }
      }

      // Property rejection on create: still enroll in segment without props.
      if (hasProps && looksLikePropertyError(createBody)) {
        console.warn('[mailer] contact properties rejected on create', createRes.status, createBody.slice(0, 300));
        const bare: Record<string, unknown> = {
          email: contact.email,
          unsubscribed: false,
          segments: [{ id: contact.audienceId }],
        };
        if (contact.firstName) bare.first_name = contact.firstName;
        if (contact.lastName) bare.last_name = contact.lastName;

        const bareRes = await fetch('https://api.resend.com/contacts', {
          method: 'POST',
          headers: authHeaders(apiKey),
          body: JSON.stringify(bare),
        });
        if (bareRes.ok) {
          const data = (await bareRes.json()) as { id: string };
          return { id: data.id, propertiesApplied: false };
        }
        const bareBody = await readErrorBody(bareRes);
        if (isConflictStatus(bareRes.status) || bareBody.toLowerCase().includes('already')) {
          await addContactToSegment(apiKey, contact.email, contact.audienceId)
            .then((r) => r.text().catch(() => undefined))
            .catch(() => undefined);
          return { id: 'existing', propertiesApplied: false };
        }
      }

      // Legacy Audiences API fallback (older MAIL_*_LIST_ID still pointing at audiences).
      const legacyPayload: Record<string, unknown> = {
        email: contact.email,
        unsubscribed: false,
      };
      if (contact.firstName) legacyPayload.first_name = contact.firstName;
      if (contact.lastName) legacyPayload.last_name = contact.lastName;
      // Do not send custom properties on legacy path — historically ignored / can 4xx.

      const legacyRes = await fetch(
        `https://api.resend.com/audiences/${encodeURIComponent(contact.audienceId)}/contacts`,
        {
          method: 'POST',
          headers: authHeaders(apiKey),
          body: JSON.stringify(legacyPayload),
        },
      );

      if (legacyRes.ok || legacyRes.status === 409) {
        const data =
          legacyRes.status === 409
            ? { id: 'existing' }
            : ((await legacyRes.json()) as { id: string });

        let propertiesApplied = false;
        if (hasProps && props) {
          const patchRes = await patchContactProperties(apiKey, contact.email, props);
          if (patchRes.ok) {
            propertiesApplied = true;
            await patchRes.text().catch(() => undefined);
          } else {
            const patchBody = await readErrorBody(patchRes);
            console.warn(
              '[mailer] legacy enroll ok; patch properties failed',
              patchRes.status,
              patchBody.slice(0, 300),
            );
          }
        }

        return { id: data.id, propertiesApplied: hasProps ? propertiesApplied : true };
      }

      const legacyBody = await readErrorBody(legacyRes);
      throw new Error(
        `Resend addContact failed: create=${createRes.status} ${createBody.slice(0, 200)}; legacy=${legacyRes.status} ${legacyBody.slice(0, 200)}`,
      );
    },

    async getContact(contact) {
      // Prefer modern global contact by email (segment membership is separate).
      const modern = await fetch(
        `https://api.resend.com/contacts/${encodeURIComponent(contact.email)}`,
        {
          method: 'GET',
          headers: authHeaders(apiKey),
        },
      );
      if (modern.ok) {
        const data = (await modern.json()) as { id: string };
        return { id: data.id };
      }
      if (modern.status !== 404) {
        await modern.text().catch(() => undefined);
      }

      const res = await fetch(
        `https://api.resend.com/audiences/${encodeURIComponent(contact.audienceId)}/contacts/${encodeURIComponent(contact.email)}`,
        {
          method: 'GET',
          headers: authHeaders(apiKey),
        },
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        const body = await readErrorBody(res);
        throw new Error(`Resend getContact failed: ${res.status} ${body}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },
  };
}

export function unsubscribeFooter(email: string, siteUrl: string): { html: string; text: string } {
  const unsub = `${siteUrl}/privacy#unsubscribe`;
  return {
    html: `<p style="color:#555555;font-size:13px;margin-top:32px;line-height:1.5;">You received this because you asked for the Indie Launch Playbook.<br/><a href="${unsub}" style="color:#111111;text-decoration:underline;">Unsubscribe</a> · <a href="mailto:hello@nakhapetov.com" style="color:#111111;text-decoration:underline;">hello@nakhapetov.com</a></p>`,
    text: `\n\nUnsubscribe: ${unsub}\nContact: hello@nakhapetov.com\n(Requested for: ${email})`,
  };
}
