/**
 * Кадры карточки Life Journey RPG.
 * Менять порядок и список здесь — без правок вёрстки.
 * Кадры 3–4: enabled: false, пока владелец не заменит файлы.
 */
export interface LjHero {
  id: string;
  /** Basename under /img/lj/ (without extension) */
  file: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

export interface LjPhoneFrame {
  id: string;
  file: string;
  width: number;
  height: number;
  alt: string;
  /** false = не показывать, пока файл не заменён */
  enabled: boolean;
}

export interface LjMascot {
  file: string;
  width: number;
  height: number;
  alt: string;
}

export const ljHero: LjHero = {
  id: 'hero',
  file: 'lj-rpg-hero',
  width: 1200,
  height: 750,
  alt: 'Life Journey RPG pixel-art scene: a castle at sunset with three heroes and the mascot Linter',
  caption: 'Fig. 1. Life Journey RPG — the world.',
};

/** Spare hero (city / Linter style mismatch) — kept in hub-assets, not used on site. */
export const ljHeroAltFile = 'lj-rpg-hero-alt';

export const ljPhones: LjPhoneFrame[] = [
  {
    id: 'quests',
    file: 'lj-rpg-phone-1-quests',
    width: 540,
    height: 1200,
    alt: "Life Journey RPG quest journal with today's quests and XP",
    enabled: true,
  },
  {
    id: 'rituals',
    file: 'lj-rpg-phone-2-rituals',
    width: 540,
    height: 1200,
    alt: 'Life Journey RPG Rituals screen with series shields',
    enabled: true,
  },
  {
    id: 'focus',
    file: 'lj-rpg-phone-3-focus',
    width: 540,
    height: 1200,
    alt: 'Life Journey RPG Focus Mode with a countdown timer',
    enabled: false,
  },
  {
    id: 'chronicle',
    file: 'lj-rpg-phone-4-chronicle',
    width: 540,
    height: 1200,
    alt: 'Life Journey RPG Chronicle diary tab',
    enabled: false,
  },
];

export const ljMascot: LjMascot = {
  file: 'linter',
  width: 420,
  height: 475,
  alt: 'Linter, the Life Journey RPG owl mascot',
};

export function ljSrc(file: string, ext: 'webp' | 'avif' | 'jpg' | 'png'): string {
  return `/img/lj/${file}.${ext}`;
}

export const enabledPhones = () => ljPhones.filter((p) => p.enabled);
