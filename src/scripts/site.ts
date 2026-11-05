/**
 * Клиентские взаимодействия и лёгкая аналитика.
 * Сайт работает и без этого скрипта.
 */

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

type RouteStation = {
  id: number;
  title: string;
  tip: string;
  trap: string;
  chapterHref: string;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
    __ROUTE_STATIONS__?: RouteStation[];
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
          `<span class="word" style="animation-delay:${i * 0.05}s">${word}&nbsp;</span>`,
      )
      .join('');
  });
}

function initJournalRows() {
  document.querySelectorAll<HTMLElement>('[data-journal-row]').forEach((row) => {
    row.addEventListener('focus', () => row.classList.add('is-open'));
    row.addEventListener('blur', () => row.classList.remove('is-open'));
  });
}

function initRoute() {
  const route = document.querySelector<HTMLElement>('[data-route]');
  if (!route) return;

  const stations = window.__ROUTE_STATIONS__ ?? [];
  const panel = route.querySelector<HTMLElement>('[data-route-panel]');
  const trapEl = route.querySelector<HTMLElement>('[data-route-trap]');
  const tipEl = route.querySelector<HTMLElement>('[data-route-tip]');
  const linkEl = route.querySelector<HTMLAnchorElement>('[data-route-link]');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          route.classList.add('is-drawn');
          io.disconnect();
        }
      }
    },
    { threshold: 0.35 },
  );
  io.observe(route);

  const nodes = route.querySelectorAll<HTMLElement>('[data-route-node]');

  function setOpen(step: number | null) {
    nodes.forEach((node) => {
      const id = Number(node.dataset.step);
      const open = step !== null && id === step;
      node.setAttribute('aria-expanded', open ? 'true' : 'false');
      node.classList.toggle('is-active', open);
    });

    if (!panel || !trapEl || !tipEl || !linkEl) return;
    const station = stations.find((s) => s.id === step);
    if (!station) {
      panel.hidden = true;
      return;
    }
    trapEl.textContent = station.trap;
    tipEl.textContent = station.tip;
    linkEl.href = station.chapterHref;
    panel.hidden = false;
  }

  nodes.forEach((btn) => {
    const activate = () => {
      const step = Number(btn.dataset.step);
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (open) {
        setOpen(null);
        return;
      }
      setOpen(step);
      capture('route_node_open', { step });
    };

    btn.addEventListener('click', (e) => {
      // Не перехватываем клик по ссылке внутри мобильной детали
      if ((e.target as HTMLElement).closest('a')) return;
      activate();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
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
initJournalRows();
initRoute();
initAnalyticsClicks();
waitForPostHogAndView();
