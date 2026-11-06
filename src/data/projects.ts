/**
 * Единственный конфиг карточек проектов на главной.
 * Новый проект = новая запись в массиве.
 */
export type ProjectStatus = string;

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string;
  year: string;
  /** Выделять как отдельный мир (LJ RPG) */
  featuredWorld?: boolean;
  /** Основная CTA */
  cta: {
    label: string;
    href: string;
  };
  /** Опциональный бейдж Google Play (файл даст владелец) */
  playStore?: {
    href: string;
    /** Путь к официальному бейджу; если файла нет — показываем текстовую заглушку */
    badgeSrc?: string;
  };
  /** Путь к картинке; если нет — слот screenshot pending */
  image?: string;
  imageAlt?: string;
}

export const projects: Project[] = [
  {
    id: 'lj-rpg',
    name: 'Life Journey RPG',
    status: 'Live · Web and Android',
    year: '2026',
    featuredWorld: true,
    description:
      'Turn your day into a story. Quests, habits, a focus timer and an AI chronicler, in a dark-fantasy world.',
    cta: {
      label: 'Open the app',
      href: 'https://lj-rpg.com/?utm_source=nakhapetov.com&utm_medium=hub&utm_campaign=card',
    },
    playStore: {
      href: 'https://play.google.com/store/apps/details?id=com.ljrpg.app&referrer=utm_source%3Dnakhapetov.com%26utm_medium%3Dhub%26utm_campaign%3Dcard',
      badgeSrc: '/images/google-play-badge.png',
    },
    imageAlt: 'Life Journey RPG app world and phone screens',
  },
  {
    id: 'playbook',
    name: 'The Indie Launch Playbook',
    status: 'Free chapter · Checking demand',
    year: '2026',
    description:
      'From vibe-coded app to paid product: web payments, Google Play, subscriptions and an AI Pack. The route in order, with every wrong turn marked.',
    cta: {
      label: 'Get the free chapter',
      href: '/playbook',
    },
  },
];

/** Соцссылки в футере; пустые не показываются */
export const socialLinks: { label: string; href: string }[] = [];
