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
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

function initHeroGlow() {
  if (reducedMotion || !finePointer) return;
  const hero = document.querySelector<HTMLElement>('[data-hero-glow]');
  if (!hero) return;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty('--gx', `${x}%`);
    hero.style.setProperty('--gy', `${y}%`);
  });
}

function initCards() {
  if (reducedMotion || !finePointer) return;
  document.querySelectorAll<HTMLElement>('[data-interactive-card]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotY = (px - 0.5) * 8;
      const rotX = (0.5 - py) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      card.classList.add('is-lit');
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.classList.remove('is-lit');
    });
  });
}

function initRoute() {
  const route = document.querySelector<HTMLElement>('[data-route]');
  if (!route) return;

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

  route.querySelectorAll<HTMLButtonElement>('[data-route-node]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      route.querySelectorAll('[data-route-node]').forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
      });
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open) capture('route_node_open', { step: Number(btn.dataset.step) });
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
initHeroGlow();
initCards();
initRoute();
initAnalyticsClicks();
waitForPostHogAndView();
