/**
 * Конфиг страницы плейбука.
 * checkoutUrl пуст по умолчанию — кнопка покупки скрыта.
 * Маршрут: src/data/route.ts · хроника: src/data/log.ts
 */
export const playbook = {
  checkoutUrl: '' as string,
  edition: 'November 2026',
  freeChapterPath: '/playbook/chapter-1',
  stats: [
    { value: '7', label: 'steps in order' },
    { value: '17', label: 'traps and fixes' },
    { value: '14', label: 'AI briefs' },
    {
      value: '1',
      label: 'update cycle',
      note: 'Reviewed against platform changes on a schedule.',
    },
  ],
  faq: [
    {
      q: 'Is this a course?',
      a: 'No. It is a written playbook plus a Markdown pack for your AI coding tool.',
    },
    {
      q: 'Will it get my app approved?',
      a: 'No guarantees. It shows what reviewers check and where first-timers get stuck.',
    },
    {
      q: 'Who is it for?',
      a: 'Solo developers shipping an app built with AI tools who want to take real payments.',
    },
    {
      q: 'What does it cover?',
      a: "Web payments through a merchant of record, Google Play setup, review, subscriptions, the fee program and a zero-budget promotion plan.",
    },
  ],
};

export const site = {
  name: 'Tim Nakhapetov',
  domain: 'nakhapetov.com',
  url: 'https://nakhapetov.com',
  email: 'hello@nakhapetov.com',
  year: 2026,
};
