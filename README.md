# nakhapetov.com — сайт-хаб

Минималистичный статический сайт на Astro + Cloudflare Pages Functions: витрина проектов и посадочная страница Indie Launch Playbook с двойным подтверждением email.

## Стек

- Astro (статический `dist`)
- Cloudflare Pages + Functions (`/functions/api/*`)
- Resend (через тонкий адаптер `functions/lib/mailer.ts`)
- PostHog (`persistence: "memory"`, без cookie-баннера)
- Cloudflare Turnstile

## Локальный запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

Результат — каталог `dist/`. Functions при локальной проверке:

```bash
npx wrangler pages dev dist
```

## Создать репозиторий и подключить Cloudflare Pages

1. Создайте **новый** публичный репозиторий на GitHub (например `nakhapetov.com` или `nakhapetov-com`). Это **не** репозиторий Life Journey RPG.
2. Запушьте код на `main`:
   ```bash
   git remote add origin git@github.com:<user>/nakhapetov.com.git
   git push -u origin main
   ```
3. В Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → подключите GitHub-репозиторий.
4. Настройки сборки:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (корень репозитория)
5. После первого деплоя привяжите кастомный домен `nakhapetov.com`.
6. Редирект `www` → apex: в Cloudflare DNS добавьте `www` (CNAME/прокси) и в Pages → Custom domains добавьте `www.nakhapetov.com` (Cloudflare предложит редирект на основной домен) либо правило Redirect Rules: `www.nakhapetov.com/*` → `https://nakhapetov.com/$1` (301).

## Переменные окружения

Секреты и ключи задаются **только** в Cloudflare Pages → Settings → Environment variables. Значения в репозиторий и в чат не класть.

| Имя | Где | Назначение |
| --- | --- | --- |
| `TURNSTILE_SECRET` | Production (secret) | Проверка Turnstile на `/api/subscribe` |
| `TURNSTILE_SITE_KEY` | Production | Публичный ключ виджета (см. также `PUBLIC_…`) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build + Production | То же значение, что `TURNSTILE_SITE_KEY` — нужно Astro на этапе сборки |
| `MAIL_PROVIDER_API_KEY` | Production (secret) | API-ключ Resend |
| `MAIL_LIST_ID` | Production | ID Audience (списка) в Resend |
| `MAIL_FROM` | Production (опционально) | Например `Playbook <hello@nakhapetov.com>` |
| `MAIL_DRY_RUN` | Production (опционально) | `1` — не слать письма, писать в лог |
| `TOKEN_SECRET` | Production (secret) | Секрет HMAC для ссылок подтверждения (48 ч) |
| `POSTHOG_KEY` | Production | Ключ проекта PostHog |
| `PUBLIC_POSTHOG_KEY` | Build + Production | То же значение, что `POSTHOG_KEY` — для сборки Astro |
| `SITE_URL` | Production | `https://nakhapetov.com` |

Без `MAIL_PROVIDER_API_KEY` мейлер работает в **dry-run** (письма не уходят, факт пишется в лог Functions).

## Почта (Resend)

На бесплатном плане Resend: до **3 доменов**, транзакционные письма 100/день и 3000/мес, marketing contacts до **1000**, broadcasts на существующих контактах без лимита писем. Домен `nakhapetov.com` можно добавить рядом с `lj-rpg.com`.

Перед продом: верифицировать домен в Resend (SPF/DKIM), создать Audience, прописать `MAIL_LIST_ID`.

## Структура

```
src/pages/           # /, /playbook, thanks, chapter-1, /privacy
src/data/projects.ts # карточки проектов (добавление = новая запись)
src/data/playbook.ts # checkoutUrl, route, FAQ
functions/api/       # subscribe, confirm
functions/lib/       # mailer, token, turnstile, rate-limit
public/_headers      # CSP и security headers
```

Новый проект на главной — запись в `src/data/projects.ts`.  
Кнопка покупки плейбука — заполнить `playbook.checkoutUrl` в `src/data/playbook.ts`.

## Чеклист перед запуском

- [ ] Репозиторий подключён к Cloudflare Pages, сборка зелёная
- [ ] Домен `nakhapetov.com` и редирект `www`
- [ ] Заданы все переменные окружения (имена выше)
- [ ] В Resend верифицирован `nakhapetov.com`, создан Audience
- [ ] Cloudflare Turnstile: ключи для домена
- [ ] PostHog: тот же проект, что у LJ RPG; события с `site: "hub"`
- [ ] Проба подписки с реальным адресом (confirm → thanks → глава)
- [ ] Письмо не в спаме; ссылка отписки работает
- [ ] Email Routing: `hello@nakhapetov.com`
- [ ] Бейдж Google Play и скриншот LJ RPG от владельца
- [ ] В `/privacy` заменить `[owner fills]`
- [ ] Текст бесплатной главы вместо заглушки `/playbook/chapter-1`
- [ ] Мобильная вёрстка и Lighthouse (цель 95+ по всем пунктам)
