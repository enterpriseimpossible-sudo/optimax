# OptiMax — лендінг (static site)

Односторінковий лендінг застосунку OptiMax. Чистий **vanilla HTML/CSS/JS** —
жодних CDN, шрифтів із мережі чи збірки. Усе працює офлайн.

## Вміст теки

| Файл | Призначення |
|---|---|
| `index.html` | розмітка сторінки (усі секції) |
| `styles.css` | дизайн-система: темна тема, glassmorphism, градієнти, адаптивність |
| `script.js` | `DOWNLOAD_URL` / `GITHUB_URL`, перемикач мов UA/EN, таби категорій, галерея (lightbox), анімації появи |
| `assets/` | реальні скріншоти застосунку + іконка |
| `vercel.json` | конфіг статичного хостингу (cleanUrls, кеш активів, базові заголовки) |
| `preview-desktop.png` | скріншот лендінга в десктопному розмірі |

## Локальний перегляд

Будь-який статичний сервер. Наприклад:

```bash
npx --yes http-server site -p 8902
# → http://127.0.0.1:8902
```

Або просто відкрийте `site/index.html` у браузері (файл-протокол теж працює,
бо зовнішніх запитів немає).

## Деплой на Vercel

З теки `site` (саме вона — корінь сайту, без збірки):

```bash
cd site
npx vercel --prod
```

Перший запуск спитає налаштування — приймайте типові:

* **Framework Preset:** `Other`
* **Build Command:** _(порожньо)_
* **Output Directory:** `.` (поточна тека `site`)
* **Install Command:** _(порожньо)_

Альтернатива — явно, без інтерактиву:

```bash
cd site
npx vercel deploy --prod --yes
```

Подальші деплої — та сама команда; `vercel --prod` оновить продакшн-URL.
Прев'ю-деплой без `--prod`.

> Якщо сайт має жити в підкаталозі репозиторію, у Vercel у налаштуваннях
> проєкту вкажіть **Root Directory = `site`** — тоді команда деплою
> виконується з кореня репозиторію.

## Що замінити перед публікацією

1. **`script.js` → `DOWNLOAD_URL`** — зараз стоїть заглушка `'#download'`.
   Замініть на посилання GitHub Releases, наприклад:
   `https://github.com/<org>/<repo>/releases/latest/download/OptiMax.exe`.
2. **`script.js` → `GITHUB_URL`** — зараз `https://github.com/`.
3. За потреби — `og:image` та `<link rel="icon">` в `index.html`.

## Доступність і продуктивність

* семантичні лендмарки (`header` / `main` / `footer` / `nav`), skip-link;
* `focus-visible` на всіх інтерактивних елементах, керування табами й
  lightbox з клавіатури, `aria-selected` / `aria-pressed` / `aria-expanded`;
* `prefers-reduced-motion` вимикає анімації, `prefers-contrast: more`
  підсилює контраст;
* зображення: `width`/`height` (без зсуву верстки), `loading="lazy"` для
  галереї, `fetchpriority="high"` для головного скріншота;
* нуль зовнішніх запитів — сторінка повністю автономна.
