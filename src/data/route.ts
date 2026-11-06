/**
 * Карта маршрута плейбука (6 станций).
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
    trap: 'Name spelled differently in the D-U-N-S record and at the bank.',
    /** In-page subscribe / resend form — chapter opens only with HMAC ?t=. */
    chapterHref: '#subscribe',
  },
  {
    id: 2,
    title: 'Web sales',
    tip: 'provider review, sandbox, live',
    trap: 'Provider review, sandbox, live.',
    chapterHref: null,
  },
  {
    id: 3,
    title: 'Play setup',
    tip: 'organization account, payments profile',
    trap: 'Organization account, payments profile.',
    chapterHref: null,
  },
  {
    id: 4,
    title: 'App ready',
    tip: 'flavors, signed bundle, data safety',
    trap: 'Flavors, signed bundle, data safety.',
    chapterHref: null,
  },
  {
    id: 5,
    title: 'Release',
    tip: 'internal test, review, public listing',
    trap: 'Internal test, review, public listing.',
    chapterHref: null,
  },
  {
    id: 6,
    title: 'Billing',
    tip: 'subscriptions, notifications, 15% fee',
    trap: 'Subscriptions, notifications, 15% fee.',
    chapterHref: null,
  },
];
