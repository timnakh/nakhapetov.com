/**
 * Единый источник кадров Proof / Evidence.
 * Если файла нет в public/img/proof/, слот не рендерится в production.
 * Нумерация Fig. N считается только по реально показанным кадрам.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface ProofShot {
  id: string;
  /** Basename without extension; we look for .webp/.avif/.png/.jpg */
  file: string;
  alt: string;
  caption: string;
  /** Page(s) where this shot may appear */
  page: 'playbook' | 'chapter-1' | Array<'playbook' | 'chapter-1'>;
}

const EXT_CANDIDATES = ['.webp', '.avif', '.png', '.jpg', '.jpeg'] as const;

export const proofShots: ProofShot[] = [
  {
    id: 'paddle-live',
    file: 'paddle-live',
    alt: 'Paddle dashboard showing live payments enabled',
    caption: 'Paddle dashboard, live payments enabled.',
    page: 'playbook',
  },
  {
    id: 'play-approved',
    file: 'play-approved',
    alt: 'Google Play Console showing app review approved on Nov 2',
    caption: 'Play Console, Nov 2. Review approved.',
    page: 'playbook',
  },
  {
    id: 'play-subscriptions',
    file: 'play-subscriptions',
    alt: 'Google Play Console showing subscriptions created on Nov 4',
    caption: 'Play Console, Nov 4. Subscriptions created.',
    page: 'playbook',
  },
  {
    id: 'review-email',
    file: 'review-email',
    alt: 'App review email with personal data redacted',
    caption: 'Review email, personal data redacted.',
    page: 'playbook',
  },
  {
    id: 'duns-issued',
    file: 'duns-issued',
    alt: 'D-U-N-S number confirmation with number partially redacted',
    caption: 'D-U-N-S confirmation, number partially redacted.',
    page: ['playbook', 'chapter-1'],
  },
  {
    id: 'email-routing',
    file: 'email-routing',
    alt: 'Cloudflare Email Routing configured for hello@nakhapetov.com',
    caption: 'Cloudflare Email Routing, address hello@.',
    page: ['playbook', 'chapter-1'],
  },
];

export function resolveProofSrc(file: string): string | null {
  const dir = path.join(process.cwd(), 'public/img/proof');
  for (const ext of EXT_CANDIDATES) {
    const candidate = path.join(dir, `${file}${ext}`);
    if (fs.existsSync(candidate)) {
      return `/img/proof/${file}${ext}`;
    }
  }
  return null;
}

export function isDevOrPreview(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'preview';
}

export function pagesOf(shot: ProofShot): Array<'playbook' | 'chapter-1'> {
  return Array.isArray(shot.page) ? shot.page : [shot.page];
}

export interface ResolvedProof {
  id: string;
  src: string | null;
  alt: string;
  caption: string;
  missing: boolean;
}

/** Resolve shots for a page. Missing files omitted in production. */
export function resolveProofForPage(
  page: 'playbook' | 'chapter-1',
): ResolvedProof[] {
  const showMissing = isDevOrPreview();
  const out: ResolvedProof[] = [];
  for (const shot of proofShots) {
    if (!pagesOf(shot).includes(page)) continue;
    const src = resolveProofSrc(shot.file);
    if (!src && !showMissing) continue;
    out.push({
      id: shot.id,
      src,
      alt: shot.alt,
      caption: shot.caption,
      missing: !src,
    });
  }
  return out;
}

export function resolveProofById(id: string): ResolvedProof | null {
  const shot = proofShots.find((s) => s.id === id);
  if (!shot) return null;
  const src = resolveProofSrc(shot.file);
  if (!src && !isDevOrPreview()) return null;
  return {
    id: shot.id,
    src,
    alt: shot.alt,
    caption: shot.caption,
    missing: !src,
  };
}

/** Fig number map for a page, 1-based over visible shots only. */
export function figNumbersForPage(
  page: 'playbook' | 'chapter-1',
): Record<string, number> {
  const shots = resolveProofForPage(page);
  const map: Record<string, number> = {};
  shots.forEach((s, i) => {
    map[s.id] = i + 1;
  });
  return map;
}
