/**
 * Request-time HTML fixes for the static Astro build:
 * 1) Inject Turnstile site key (build may lack PUBLIC_*; runtime TURNSTILE_SITE_KEY still works).
 * 2) Inject ?error= alerts (Astro static pages cannot read search params at request time).
 * Values never logged.
 */

interface Env {
  TURNSTILE_SITE_KEY?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  turnstile: 'Please confirm you are human and try again.',
  email: 'That email address does not look right. Please check and try again.',
  rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  token: 'That confirmation link is no longer valid. Enter your email again to get a new one.',
  config: 'Something went wrong on our side. Please try again later.',
  invalid: 'Something went wrong. Please try again.',
  already: 'You are already on the list. Check your inbox for the chapter link.',
};

function siteKeyFromEnv(env: Env): string {
  return (env.PUBLIC_TURNSTILE_SITE_KEY || env.TURNSTILE_SITE_KEY || '').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const siteKey = siteKeyFromEnv(context.env);
  const url = new URL(context.request.url);
  const errorCode = url.searchParams.get('error') || '';
  const errorMessage = ERROR_MESSAGES[errorCode] || '';

  if (!siteKey && !errorMessage) {
    return response;
  }

  const rewriter = new HTMLRewriter();

  if (siteKey) {
    rewriter.on('body', {
      element(el) {
        el.setAttribute('data-turnstile-site-key', siteKey);
      },
    });
    rewriter.on('.cf-turnstile', {
      element(el) {
        el.setAttribute('data-sitekey', siteKey);
      },
    });
  }

  if (errorMessage) {
    const html = escapeHtml(errorMessage);
    rewriter.on('[data-subscribe-error-slot]', {
      element(el) {
        el.setAttribute('role', 'alert');
        el.setAttribute('class', 'form-status is-error');
        el.removeAttribute('hidden');
        el.setInnerContent(html, { html: true });
      },
    });
  }

  return rewriter.transform(response);
};
