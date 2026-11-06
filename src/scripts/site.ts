/**
 * Клиентские взаимодействия и лёгкая аналитика.
 * Сайт работает и без этого скрипта.
 */

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: string;
      size?: string;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string | number;
};

type RouteStation = {
  id: number;
  title: string;
  tip: string;
  trap: string;
  chapterHref: string | null;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
    turnstile?: TurnstileApi;
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

  const stops = Array.from(route.querySelectorAll<HTMLElement>('[data-route-node]'));
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reducedMotion) {
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
  } else {
    route.classList.add('is-drawn');
  }

  function setOpen(step: number | null, track = false) {
    stops.forEach((stop) => {
      const id = Number(stop.dataset.step);
      const open = step !== null && id === step;
      const btn = stop.querySelector<HTMLButtonElement>('[data-route-toggle]');
      const card = stop.querySelector<HTMLElement>('[data-route-card]');
      btn?.setAttribute('aria-expanded', open ? 'true' : 'false');
      stop.classList.toggle('is-open', open);
      if (card) card.hidden = !open;
    });
    if (track && step !== null) capture('route_node_open', { step });
  }

  stops.forEach((stop) => {
    const btn = stop.querySelector<HTMLButtonElement>('[data-route-toggle]');
    if (!btn) return;
    const step = Number(stop.dataset.step);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (open) {
        setOpen(null);
        return;
      }
      setOpen(step, true);
    });

    if (hoverCapable) {
      stop.addEventListener('mouseenter', () => setOpen(step));
      stop.addEventListener('mouseleave', () => {
        if (btn.getAttribute('aria-expanded') === 'true') setOpen(null);
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(null);
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Node | null;
    if (target && !route.contains(target)) setOpen(null);
  });
}

function initTurnstile() {
  const key = (document.body.dataset.turnstileSiteKey || '').trim();
  const widgets = Array.from(document.querySelectorAll<HTMLElement>('.cf-turnstile'));

  if (!key) {
    widgets.forEach((el) => el.remove());
    return;
  }

  const armForm = (widget: HTMLElement) => {
    const form = widget.closest<HTMLFormElement>('form[data-turnstile-form]');
    const btn = form?.querySelector<HTMLButtonElement>('[data-subscribe-submit]');
    const hint = form?.querySelector<HTMLElement>('[data-turnstile-hint]');
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    if (hint) hint.hidden = false;

    const unlock = () => {
      if (!btn) return;
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
      if (hint) hint.hidden = true;
    };
    const lock = () => {
      if (!btn) return;
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      if (hint) hint.hidden = false;
    };

    widget.setAttribute('data-sitekey', key);

    const tryRender = () => {
      if (!window.turnstile) return false;
      window.turnstile.render(widget, {
        sitekey: key,
        theme: 'light',
        size: 'flexible',
        callback: () => unlock(),
        'expired-callback': () => lock(),
        'error-callback': () => lock(),
      });
      return true;
    };

    if (!tryRender()) {
      let tries = 0;
      const timer = window.setInterval(() => {
        if (tryRender() || ++tries > 50) window.clearInterval(timer);
      }, 100);
    }
  };

  widgets.forEach(armForm);
}

function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  if (!dialog) return;
  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]');

  document.querySelectorAll<HTMLElement>('[data-lightbox-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.lightboxSrc;
      const alt = btn.dataset.lightboxAlt ?? '';
      if (!src || !img) return;
      img.src = src;
      img.alt = alt;
      dialog.showModal();
    });
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function initCopyTemplate() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-template]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copyText ?? '';
      try {
        await navigator.clipboard.writeText(text);
        capture('template_copy');
        const status = btn
          .closest('[data-canonical-block]')
          ?.querySelector<HTMLElement>('[data-copy-status]');
        if (status) {
          status.hidden = false;
          setTimeout(() => {
            status.hidden = true;
          }, 2000);
        }
      } catch {
        // Clipboard may be unavailable; leave silent.
      }
    });
  });
}

function initChapter() {
  const chapter = document.querySelector<HTMLElement>('[data-chapter]');
  if (!chapter) return;

  capture('chapter_view', { path: location.pathname });

  const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
  let hit50 = false;
  let hit90 = false;

  const onScroll = () => {
    const rect = chapter.getBoundingClientRect();
    const total = chapter.offsetHeight - window.innerHeight;
    const scrolled = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
    if (progress && !reducedMotion) {
      progress.style.transform = `scaleX(${scrolled})`;
    }
    if (!hit50 && scrolled >= 0.5) {
      hit50 = true;
      capture('chapter_scroll_50');
    }
    if (!hit90 && scrolled >= 0.9) {
      hit90 = true;
      capture('chapter_scroll_90');
    }

    // Highlight TOC
    const links = document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]');
    let current = '';
    links.forEach((link) => {
      const id = link.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      if (el.getBoundingClientRect().top <= 120) current = id;
    });
    links.forEach((link) => {
      const id = link.getAttribute('href')?.slice(1);
      link.classList.toggle('is-active', id === current);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initAnalyticsClicks() {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-event]');
    if (!target?.dataset.event) return;
    const props: Record<string, unknown> = {};
    if (target.dataset.project) props.project = target.dataset.project;
    if (target.dataset.source) props.source = target.dataset.source;
    if (target.dataset.section) props.section = target.dataset.section;
    capture(target.dataset.event, props);
  });

  document.querySelectorAll('form[data-analytics="subscribe"]').forEach((form) => {
    form.addEventListener('submit', () => {
      const eventName =
        (form as HTMLFormElement).dataset.subscribeEvent || 'subscribe_submit';
      capture(eventName);
    });
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

function initCountUp() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-count-up]'));
  if (!nodes.length) return;

  const format = (el: HTMLElement, n: number) => {
    const prefix = el.dataset.prefix ?? '';
    const suffix = el.dataset.suffix ?? '';
    const decimals = Number(el.dataset.decimals ?? '0');
    const body = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
    return `${prefix}${body}${suffix}`;
  };

  const finish = (el: HTMLElement) => {
    el.textContent = el.dataset.value ?? el.textContent;
  };

  if (reducedMotion) {
    nodes.forEach(finish);
    return;
  }

  const duration = 1100;
  const animate = (el: HTMLElement) => {
    const target = Number(el.dataset.numeric ?? '0');
    if (!Number.isFinite(target)) {
      finish(el);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(el, target * eased);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        finish(el);
      }
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        animate(el);
      }
    },
    { threshold: 0.4 },
  );
  nodes.forEach((el) => io.observe(el));
}

splitHeroWords();
initJournalRows();
initRoute();
initTurnstile();
initLightbox();
initCopyTemplate();
initChapter();
initAnalyticsClicks();
initCountUp();
waitForPostHogAndView();
