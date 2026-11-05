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
  width: number;
  height: number;
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
    width: 1600,
    height: 890,
    page: 'playbook',
  },
  {
    id: 'play-approved',
    file: 'play-approved',
    alt: 'Google Play Console showing app review approved on Nov 2',
    caption: 'Play Console, Nov 2. Review approved.',
    width: 1600,
    height: 465,
    page: 'playbook',
  },
  {
    id: 'play-subscriptions',
    file: 'play-subscriptions',
    alt: 'Google Play Console showing subscriptions created on Nov 4',
    caption: 'Play Console, Nov 4. Subscriptions created.',
    width: 1600,
    height: 457,
    page: 'playbook',
  },
];

function proofDir(): string {
  return path.join(process.cwd(), 'public/img/proof');
}

export function resolveProofSrc(file: string): string | null {
  for (const ext of EXT_CANDIDATES) {
    const candidate = path.join(proofDir(), `${file}${ext}`);
    if (fs.existsSync(candidate)) {
      return `/img/proof/${file}${ext}`;
    }
  }
  return null;
}

export interface ProofSources {
  avif?: string;
  webp?: string;
  fallback: string;
}

/** Prefer AVIF → WebP sources; raster (png/jpg) as <img> fallback. */
export function resolveProofSources(file: string): ProofSources | null {
  const dir = proofDir();
  const rasterExts = ['.png', '.jpg', '.jpeg'] as const;
  let fallback: string | null = null;
  for (const ext of rasterExts) {
    if (fs.existsSync(path.join(dir, `${file}${ext}`))) {
      fallback = `/img/proof/${file}${ext}`;
      break;
    }
  }
  if (!fallback) fallback = resolveProofSrc(file);
  if (!fallback) return null;
  const avifPath = path.join(dir, `${file}.avif`);
  const webpPath = path.join(dir, `${file}.webp`);
  return {
    avif: fs.existsSync(avifPath) ? `/img/proof/${file}.avif` : undefined,
    webp: fs.existsSync(webpPath) ? `/img/proof/${file}.webp` : undefined,
    fallback,
  };
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
  sources: ProofSources | null;
  alt: string;
  caption: string;
  width: number;
  height: number;
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
    const sources = resolveProofSources(shot.file);
    const src = sources?.fallback ?? null;
    if (!src && !showMissing) continue;
    out.push({
      id: shot.id,
      src,
      sources,
      alt: shot.alt,
      caption: shot.caption,
      width: shot.width,
      height: shot.height,
      missing: !src,
    });
  }
  return out;
}

export function resolveProofById(id: string): ResolvedProof | null {
  const shot = proofShots.find((s) => s.id === id);
  if (!shot) return null;
  const sources = resolveProofSources(shot.file);
  const src = sources?.fallback ?? null;
  if (!src && !isDevOrPreview()) return null;
  return {
    id: shot.id,
    src,
    sources,
    alt: shot.alt,
    caption: shot.caption,
    width: shot.width,
    height: shot.height,
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
