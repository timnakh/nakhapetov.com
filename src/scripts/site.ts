/**
 * Клиентские взаимодействия и лёгкая аналитика.
 * Сайт работает и без этого скрипта.
 */

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function capture(event: string, props: Record<string, unknown> = {}) {
  window.posthog?.capture(event, { site: 'hub', ...props });
}

function splitHeroWords() {
  if (reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-word-reveal]').forEach((el) => {
    const text = el.textContent?.trim() ?? '';
    el.setAttribute('aria-label', text);
    el.innerHTML = text
      .split(/\s+/)
      .map(
        (word, i) =>
          `<span class="word" style="animation-delay:${i * 0.04}s">${word}&nbsp;</span>`,
      )
      .join('');
  });
}

function initRoute() {
  const route = document.querySelector<HTMLElement>('[data-route]');
  if (!route) return;

  const nodes = route.querySelectorAll<HTMLButtonElement>('[data-route-node]');

  nodes.forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      nodes.forEach((other) => other.setAttribute('aria-expanded', 'false'));
      if (!open) {
        btn.setAttribute('aria-expanded', 'true');
        capture('route_node_open', { step: Number(btn.dataset.step) });
      }
    });
  });
}

function initAnalyticsClicks() {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-event]');
    if (!target?.dataset.event) return;
    const props: Record<string, unknown> = {};
    if (target.dataset.project) props.project = target.dataset.project;
    if (target.dataset.source) props.source = target.dataset.source;
    capture(target.dataset.event, props);
  });

  document.querySelectorAll('form[data-analytics="subscribe"]').forEach((form) => {
    form.addEventListener('submit', () => capture('subscribe_submit'));
  });
}

function waitForPostHogAndView() {
  const key = document.body.dataset.posthogKey;
  if (!key) return;
  let tries = 0;
  const tick = () => {
    if (window.posthog) {
      capture('hub_view', { path: location.pathname });
      return;
    }
    if (tries++ < 40) setTimeout(tick, 100);
  };
  tick();
}

splitHeroWords();
initRoute();
initAnalyticsClicks();
waitForPostHogAndView();
