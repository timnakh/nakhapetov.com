/**
 * Хроника реальных вех. Править даты/события здесь.
 * Не добавлять факты, которых нет у владельца.
 */
export interface Milestone {
  date: string;
  event: string;
  /** Optional outbound link (e.g. Play Store listing) */
  href?: string;
  /** Optional proof shot id from proof.ts → Fig. N on /playbook#evidence */
  fig?: string;
}

export const milestones: Milestone[] = [
  { date: 'Oct 23 2026', event: 'Paddle live', fig: 'paddle-live' },
  {
    date: 'Oct 28 2026',
    event: 'Google Play organization account verified',
  },
  {
    date: 'Nov 2 2026',
    event: 'Google Play review approved, app live',
    href: 'https://play.google.com/store/apps/details?id=com.ljrpg.app',
    fig: 'play-approved',
  },
  {
    date: 'Nov 4 2026',
    event: 'Subscriptions created in Play Console',
    fig: 'play-subscriptions',
  },
];
