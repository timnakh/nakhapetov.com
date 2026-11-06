/**
 * GET /playbook/chapter-1 — HMAC-gated free chapter (Pages Function route).
 * Ensures this path is never served as a bare static asset.
 */

import { gateChapterRequest, type ChapterGateEnv } from '../lib/chapter-gate';

export const onRequest: PagesFunction<ChapterGateEnv> = async (context) => {
  return gateChapterRequest(context.request, context.env);
};
