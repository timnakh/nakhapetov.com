/**
 * Inject Turnstile site key into HTML at request time.
 * Astro only sees PUBLIC_* at build; runtime TURNSTILE_SITE_KEY still reaches the browser here.
 * Values never logged.
 */

interface Env {
  TURNSTILE_SITE_KEY?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
}

function siteKeyFromEnv(env: Env): string {
  return (env.PUBLIC_TURNSTILE_SITE_KEY || env.TURNSTILE_SITE_KEY || '').trim();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const siteKey = siteKeyFromEnv(context.env);
  if (!siteKey) {
    return response;
  }

  return new HTMLRewriter()
    .on('body', {
      element(el) {
        el.setAttribute('data-turnstile-site-key', siteKey);
      },
    })
    .on('.cf-turnstile', {
      element(el) {
        el.setAttribute('data-sitekey', siteKey);
      },
    })
    .transform(response);
};
