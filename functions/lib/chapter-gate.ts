/**
 * Server-side gate for the free chapter HTML.
 * Asset path: /__protected/chapter-1/ (not publicly routable).
 */

import { clientIp, rateLimit } from './rate-limit';
import { verifyChapterToken } from './token';

export interface ChapterGateEnv {
  TOKEN_SECRET?: string;
  SITE_URL?: string;
  ASSETS: { fetch: (input: Request | string) => Promise<Response> };
}

function subscribeRedirect(siteUrl: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl}/playbook#subscribe`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function gateChapterRequest(
  request: Request,
  env: ChapterGateEnv,
): Promise<Response> {
  const siteUrl = (env.SITE_URL || 'https://nakhapetov.com').replace(/\/$/, '');
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    return subscribeRedirect(siteUrl);
  }

  const ip = clientIp(request);
  const limited = rateLimit(`chapter-gate:ip:${ip}`, {
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return subscribeRedirect(siteUrl);
  }

  const url = new URL(request.url);
  const token = (url.searchParams.get('t') || '').trim();
  const secret = env.TOKEN_SECRET?.trim();

  if (!token || !secret) {
    return subscribeRedirect(siteUrl);
  }

  const verified = await verifyChapterToken(token, secret);
  if (!verified) {
    return subscribeRedirect(siteUrl);
  }

  const assetUrl = new URL('/__protected/chapter-1/', url.origin);
  const assetRes = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'text/html' },
    }),
  );

  if (!assetRes.ok) {
    console.error('[chapter-gate] protected asset missing', assetRes.status);
    return subscribeRedirect(siteUrl);
  }

  const headers = new Headers(assetRes.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.delete('CDN-Cache-Control');

  return new Response(method === 'HEAD' ? null : assetRes.body, {
    status: 200,
    headers,
  });
}
