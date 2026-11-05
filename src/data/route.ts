/**
 * Карта маршрута плейбука (7 станций).
 * Править здесь — без правок вёрстки.
 */
export interface RouteStation {
  id: number;
  title: string;
  tip: string;
  /** Подпись шага / ловушки в панели */
  trap: string;
  /** Ссылка на главу; null = только метка «In the full edition» */
  chapterHref: string | null;
}

export const routeStations: RouteStation[] = [
  {
    id: 1,
    title: 'Identity',
    tip: 'entity, bank, D-U-N-S, business email',
    trap: 'Step 1 — Name spelled differently in the D-U-N-S record and at the bank.',
    chapterHref: '/playbook/chapter-1',
  },
  {
    id: 2,
    title: 'Web sales',
    tip: 'provider review, sandbox, live',
    trap: 'Step 2 — provider review, sandbox, live',
    chapterHref: null,
  },
  {
    id: 3,
    title: 'Play setup',
    tip: 'organization account, payments profile',
    trap: 'Step 3 — organization account, payments profile',
    chapterHref: null,
  },
  {
    id: 4,
    title: 'App ready',
    tip: 'flavors, signed bundle, data safety',
    trap: 'Step 4 — flavors, signed bundle, data safety',
    chapterHref: null,
  },
  {
    id: 5,
    title: 'Release',
    tip: 'internal test, review, public listing',
    trap: 'Step 5 — internal test, review, public listing',
    chapterHref: null,
  },
  {
    id: 6,
    title: 'Billing',
    tip: 'subscriptions, notifications, 15% fee',
    trap: 'Step 6 — subscriptions, notifications, 15% fee',
    chapterHref: null,
  },
  {
    id: 7,
    title: 'Promotion',
    tip: 'plan, measure, iterate',
    trap: 'Step 7 — plan, measure, iterate',
    chapterHref: null,
  },
];
