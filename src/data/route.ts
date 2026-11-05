/**
 * Карта маршрута плейбука (7 станций).
 * Править здесь — без правок вёрстки.
 */
export interface RouteStation {
  id: number;
  title: string;
  tip: string;
  /** Подпись ловушки (на базе tip; без новых обещаний) */
  trap: string;
  /** Ссылка на главу (пока глава 1 — единственный stub) */
  chapterHref: string;
}

export const routeStations: RouteStation[] = [
  {
    id: 1,
    title: 'Identity',
    tip: 'entity, bank, D-U-N-S, business email',
    trap: 'Trap #1 — entity, bank, D-U-N-S, business email',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 2,
    title: 'Web sales',
    tip: 'provider review, sandbox, live',
    trap: 'Trap #2 — provider review, sandbox, live',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 3,
    title: 'Play setup',
    tip: 'organization account, payments profile',
    trap: 'Trap #3 — organization account, payments profile',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 4,
    title: 'App ready',
    tip: 'flavors, signed bundle, data safety',
    trap: 'Trap #4 — flavors, signed bundle, data safety',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 5,
    title: 'Release',
    tip: 'internal test, review, public listing',
    trap: 'Trap #5 — internal test, review, public listing',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 6,
    title: 'Billing',
    tip: 'subscriptions, notifications, 15% fee',
    trap: 'Trap #6 — subscriptions, notifications, 15% fee',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 7,
    title: 'Promotion',
    tip: 'plan, measure, iterate',
    trap: 'Trap #7 — plan, measure, iterate',
    chapterHref: '/playbook/chapter-1',
  },
];
