/**
 * Хроника реальных вех. Править даты/события здесь.
 * Не добавлять факты, которых нет у владельца.
 */
export interface Milestone {
  date: string;
  event: string;
}

export const milestones: Milestone[] = [
  { date: 'Oct 23 2026', event: 'Paddle live' },
  { date: 'Oct 28 2026', event: 'Google Play organization account verified' },
  { date: 'Nov 2 2026', event: 'Google Play review approved, app live' },
  { date: 'Nov 4 2026', event: 'Subscriptions created in Play Console' },
];
