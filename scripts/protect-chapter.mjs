/**
 * Move built chapter HTML off the public /playbook/chapter-1 URL.
 * Served only by functions/playbook/chapter-1.ts after HMAC check.
 */
import { existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist/playbook/chapter-1');
const dest = join(root, 'dist/__protected/chapter-1');

if (!existsSync(src)) {
  console.error('[protect-chapter] missing dist/playbook/chapter-1 — did astro build run?');
  process.exit(1);
}

await mkdir(dirname(dest), { recursive: true });
if (existsSync(dest)) {
  await rm(dest, { recursive: true, force: true });
}
await rename(src, dest);
console.log('[protect-chapter] moved dist/playbook/chapter-1 → dist/__protected/chapter-1');
