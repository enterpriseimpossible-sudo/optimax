# MEMORY — OptiMax

## Поточний статус
**v1.4.0 — ГОТОВО + open-source.** Застосунок **повністю безкоштовний** — подарунок від **ER7 Studio**
(напис у сайдбарі «OptiMax 1.4.0 · ER7 Studio» та в Налаштуваннях «© 2026 ER7 Studio ·
безкоштовно для всіх»). Ліцензування Free/тріал/PRO, ключі `OPTMX-…`, активацію, гейтинг
і менеджер ключів **прибрано повністю** (`core/license.js`, `tools/make-license.js`,
`tools/key-manager.js`, «Менеджер ключів.cmd», `tests/license.test.js`, локалі `license.*`
(27 ключів), UI-чип/модалка/локи — видалено). Категорію **«Порядок»** перероблено: папки
створюються **на самому робочому столі**, туди сортуються і **ярлики програм** (офісні →
«Офісні програми», решта → «Програми»), а файли — за типами; ярлики на папки/сайти й
системні значки («Цей ПК», «Завантаження», Кошик) лишаються. У «Завантаженнях» — те саме
**всередині самої папки** (свіжі файли до 24 год не чіпаються).
Каталог 35 задач / 5 категорій, 39 PS-скриптів, **270 ключів × 5 мов**.
Перевірки: тести 14/14, синтаксис PS 39/39, check-ui 0 розбіжностей (270×5; 231 ключ коду,
44 data-i18n, 74 id), пісочниця «Порядку» 45/45 (з ярликами та undo round-trip).
Дата: 2026-10-16. Проєкт: `F:\Робоча папка\Проекти\OptiMax` — код у `src/`, open-source (MIT),
git-репозиторій (гілка `main`), ярлик «Запустити OptiMax.lnk» у корені проєкту.

## Статус v1.3.0 (історія)
Три теми оформлення: світла (типова), сіра та чорна. Кольори на CSS-змінних (`:root` = світла,
`body.theme-gray|black` перекривають; чорна = колишній «dark premium»); перемикач зі свотчами
в Налаштуваннях, тема в `i18n:get`, фон вікна `THEME_BG` у main.

## Статус v1.1.0 (історія)
Ліцензування FREE/тріал/PRO (офлайн ключі), 5 мов інтерфейсу, екран налаштувань,
економний режим для слабких ПК, демо-ключі для README. **Усе ліцензійне знято у v1.4.0.**
Перевірки: тести 22/22, синтаксис PS 35/35, цілісність UI (282 ключі × 5 мов, 0 розбіжностей),
mock-прогони (тріал/FREE/PRO, модалки, мови) + реальні скріншоти застосунку.

## Статус v1.0.0 (історія)
Каталог 31 задач (cleanup 10 / perf 10 / network 6 / system 5), 4 профілі
(quick 9, deep 10, gaming 8, full 17), 35 PS-скриптів, черга з undo, дашборд, автозапуск.
Portable-реліз: `release/OptiMax-win32-x64/OptiMax.exe` (asar, іконка + version info вшиті).
Перевірено: тести 9/9, синтаксис PS 35/35, реальний прогін — 30/30, 117.4 МБ.

## Рішення
- 2026-10-16: Стек — Electron + vanilla UI + PowerShell 5.1 (стек машини: Node 24, без Python-залежностей; uv-Python є, але не потрібен).
- 2026-10-16: Undo-записи формують самі PS-скрипти (вони знають попередні значення) → `restore.json` у %APPDATA%/OptiMax.
- 2026-10-16: Керування автозапуском — через StartupApproved-прапорці (той самий механізм, що в Task Manager), а не переміщення ключів.
- 2026-10-16: Console-задачі (SFC/DISM/chkdsk) запускаються у видимому вікні PowerShell; черга чекає закриття.
- 2026-10-16: Живі CPU/RAM — з Node `os` (без спавну процесів), диски/SMART — PS раз на 15 с.
- 2026-10-16: **Electron запінено на 31.7.7** — electron 44+ не працює без VC++ runtime (msvcp140.dll/vcruntime140.dll) на машині без інсталятора. НЕ оновлювати.
- 2026-10-16: Скрипти передаються в PowerShell через `-EncodedCommand` (Node читає їх навіть із asar) — тому і упакований застосунок виконує задачі.
- 2026-10-16: Пакування: `@electron-internal/extract-zip` (native) вимагає VC++ DLL — рішення: копіювати
  `msvcp140.dll`, `vcruntime140.dll`, `vcruntime140_1.dll` у `node_modules/@electron-internal/extract-zip/`
  (взято з `C:\Program Files (x86)\Microsoft\EdgeCore\<ver>\`). Без цього `npm run package` падає ще на розпакуванні.
- 2026-10-16: Іконка/версія exe — через `resedit` (чистий JS, без native-бінарників): `tools/embed-icon.js`;
  іконка генерується `tools/make-icon.ps1` (System.Drawing, 7 розмірів, PNG-в-ICO) → `assets/icon.ico`.
- 2026-10-16: UI має mock-режим (`ui/app.js`) — той самий index.html працює в звичайному браузері (`node tools/serve-ui.js 8899`, параметри `?theme=light|gray|black`, `?autorun=1`, `?noadmin=1`).
- 2026-10-16 (v1.1): i18n — `core/i18n.js` + `core/locales/{uk,en,pl,de,ru}.json` (282 ключі);
  фолбек `<locale>→en→uk→ключ`; статичний HTML через `data-i18n`, каталог задач локалізує main
  (`localizedCatalog`); зміна мови = `settings:set {locale}` + `location.reload()`.
- 2026-10-16 (v1.1, знято у v1.4.0): Ліцензування — офлайн ключі `OPTMX-…` (HMAC-SHA256),
  тріал 7 днів від `usage.firstRunAt`, FREE = safe+quick, PRO = решта, гейтинг у `run:start` і UI.
- 2026-10-16 (v1.1, знято у v1.4.0): `PURCHASE_URL` і ціна — плейсхолдери (`core/license.js`).
- 2026-10-16 (v1.1): Налаштування — `DEFAULT_SETTINGS` у `core/store.js` (locale/theme/liteMode/
  statsIntervalSec/confirmRun); `settings:set` — whitelist ключів.
- 2026-10-16 (v1.1): Економний режим — автодетект (cpus≤4 або RAM≤6 ГБ), CSS `body.lite`
  (без анімацій/тіней/градієнтів) + Electron `enable-low-end-device-mode`.
- 2026-10-16 (v1.1): Ініціалізація UI — статична локалізація й лайт застосовуються ДО важких IPC;
  `app:info` (spawn PowerShell для isAdmin) — окремо, щоб екран не «висів» на слабких ПК.
  Плюс fallback-показ вікна через 4 с, якщо `ready-to-show` забарилась.
- 2026-10-16 (v1.2; правила оновлено у v1.4.0): Категорія «Порядок» — 4 задачі (робочий стіл /
  Завантаження / імена / фото), усі `risk='medium'`. Профілі їх не включають — організація файлів
  завжди обирається вручну.
- 2026-10-16 (v1.2): PRELUDE-хелпери `Get-UniquePath` (вільна назва «файл (2).ext») і
  `Move-FileUndo` (move + undo-запис `{kind='filemove'; from; to; label}`).
- 2026-10-16 (v1.2; оновлено у v1.4.0): Правила файлових задач — папки-кошики створюються
  **на місці** (робочий стіл / всередині «Завантажень»); сортуються і файли, і **ярлики програм**
  (`.lnk` → `.exe`: офісні маркери `winword|excel|powerpnt|outlook|onenote|msaccess|mspub|teams|lync`
  або шлях `\Microsoft Office\`/`\office1[456]\` → «Офісні програми», решта → «Програми»);
  ярлики на папки/сайти (`.url`), `desktop.ini`, hidden/system і незавершені завантаження
  (.crdownload/.part/…) **не чіпаються**; у «Завантаженнях» файли, молодші за 24 год, лишаються;
  конфлікти назв — суфікс « (2)».
- 2026-10-16 (v1.2): Кошики українською (типова мова): Зображення/Документи/Відео/Музика/Архіви/
  Інсталятори/Інше; наявні папки перевикористовуються. Службовий env `OPTIMAX_ORDER_ROOT` —
  підміна кореневої теки для пісочниці `tools/test-order.js` (у продакшені не задається).
- 2026-10-16 (v1.2; **видалено у v1.4.0**): Менеджер ключів — `tools/key-manager.js`
  (меню + new|batch|list|check|export|note|remove), реєстр `keys/keys.json`, CSV для Excel,
  launcher «Менеджер ключів.cmd». Більше не потрібен: застосунок безкоштовний, ключів немає.
- 2026-10-16 (v1.3): Теми — `theme` у `DEFAULT_SETTINGS` ('light'|'gray'|'black'; типова — світла);
  `:root` тримає світлі значення (щоб не було «темного спалаху» до застосування теми),
  `body.theme-*` перекривають змінні; у main — `THEME_BG` для нативного фону вікна;
  whitelist `settings:set` розширено.
- 2026-10-16 (v1.3): Світла тема — власні контрастні текстові кольори (бейджі/статуси темніші),
  м'якші тіні/glow; сіра — нейтральна графітова з тими ж акцентами; `color-scheme` перемикається
  для нативних контролів (скролбари, випадайки).

## Баги (виправлено)
- `restore.ps1`: `ConvertFrom-Json '[]'` давав $null-елемент → відкат падав. Виправлено фільтрацією.
- `ui/app.js`: був відсутній `bindDashboard()` → падіння ініціалізації UI. Додано.
- CSP оновлено для file:// (заблоковані інлайн-скрипти).
- Іконка вікна завантажується лише якщо файл існує (main.js) — до генерації icon.ico падінь не було.
- Чекбокси-картки: підсвітка через `.check :has(input:checked)`.
- Правопис: русизми «Дампы» прибрані з UI-текстів (tasks.js, app.js mock, analyze.ps1, crashdumps.ps1).
- v1.1: лічильник «Обрано» та лічильники категорій враховували заблоковані PRO-задачі у FREE →
  `selectedIds()`, `updateSelSummary()`, нав-лічильники фільтрують `taskLocked`.
- v1.1: PRO-бейдж у заголовку профільної картки ламав верстку → винесено окремим рядком.
- v1.1: ініціалізація UI блокувалась очікуванням `app:info` (PowerShell isAdmin) на слабкому ПК →
  локалізація/лайт одразу, `app:info` пізніше (див. Рішення).

## Нюанси
- Файли в `%TEMP%` можуть зникати під час роботи застосунку — це норма (задача «Тимчасові файли користувача» їх видаляє).
- Черга слідує порядку каталогу: cleanup → perf → network → system; консольні задачі блокують чергу до закриття вікна.
- `C:\Temp` на цій машині = `%TEMP%` користувача (обережно з тимчасовими файлами під час прогонів).
- PrintWindow може віддавати застарілий кадр — для скріншотів використовувати `tools/shot.ps1` (пауза + подвійний захват).
- Клік/скрол по згорнутому вікну дає координати `-32000` — у `tools/click.ps1`/`scroll.ps1`
  безумовний `SW_RESTORE` перед дією; після Stop-Process робити паузу 3–5 с перед новим запуском.
- Демо-стани застосунку: `node tools/patch-settings.js theme=black lastView=cleanup locale=en`.
- Пісочниця «Порядку»: `node tools/test-order.js` (фейкові теки в `C:\Temp\opencode\order-sandbox`,
  сама прибирає за собою; `--keep` — залишити для огляду). Реальні теки не чіпаються.
- Черга йде порядком каталогу: cleanup → order → perf → network → system.
- `restore.ps1` kind `filemove`: якщо старий шлях зайнятий, файл кладеться поруч з унікальною
  назвою (нічого не перезаписується).
- Демо-ключі/менеджер ключів — **більше не існують**: у v1.4.0 усі ключі, активація та реєстри
  видалено разом із ліцензуванням.
- Теми: перемикач у «Налаштуваннях» — три кнопки зі свотчами; вибір зберігається одразу
  (`settings:set`); «Скинути налаштування» повертає світлу. У mock — `?theme=light|gray|black`.
- Безкоштовна версія: без тріалу й ключів — усі функції доступні з першого запуску
  (`settings.json` містить лише інтерфейсні налаштування та позначки задач).

## Зміни
- 2026-10-16: створено проєкт з нуля (backend, 35 скриптів, UI, тести).
- 2026-10-16: упаковано portable exe; вирішено проблему extract-zip (VC++ DLL); іконка + version info (resedit);
  реальний прогін 30 задач у запакованому застосунку; README написано; русизми виправлено; docs фіналізовано.
- 2026-10-16 (v1.1.0): `core/i18n.js` + 5 локалей; `core/license.js` + `tools/make-license.js` (`npm run keygen`);
  `core/store.js` (налаштування/usage/resetSettings/clearLogs); `core/runner.js`, `ps.js`, `startup.js` — i18n;
  `main.js` — i18n, PRO-гейтинг `run:start`, lite, нові IPC (i18n/settings/license/logs/data), title з i18n;
  `preload.js` — нові канали; `ui/index.html` — чип ліцензії, екран налаштувань, нові іконки, `data-i18n`;
  `ui/styles.css` — settings/license/locked/lite секції; `ui/app.js` — повний перепис (dict, tiers, налаштування,
  локи, тости, mock з локалями); tests (22/22); tools: check-ui, make-license, patch-settings, shot/click/scroll/sendkey;
  README (мови/PRO/демо-ключі), docs/EULA.md, docs/PRIVACY.md; скріншоти settings-uk/license-modal/free-locked/dashboard-en;
  репак 1.1.0; копія `F:\OptiMax` + ярлик.
- 2026-10-16 (v1.2.0): категорія «Порядок» — `core/tasks.js` (+4 задачі, +категорія), nav+іконка
  `i-order` у `ui/index.html`, 10 ключів × 5 мов (292); скрипти `order/tidy-desktop|downloads|names|photos.ps1`;
  PRELUDE `Get-UniquePath`/`Move-FileUndo`; `restore.ps1` kind `filemove`; VIEWS/CATEGORY_VIEWS + mock у `app.js`;
  `tools/test-order.js` (пісочниця + undo round-trip); бампи 1.2.0 (package.json/index.html/mock); README/EULA/PRIVACY;
  репак 1.2.0; оновлення копії `F:\OptiMax`.
- 2026-10-16 (v1.2.0, інструменти): менеджер ключів — `tools/key-manager.js`, launcher «Менеджер ключів.cmd»
  (подвійний клік), npm `keys`, README-розділ «Продавцю: менеджер ключів»; коментарі в `core/license.js` і
  `tools/make-license.js`; перевірено повний цикл (генерація/партія/перевірка/нотатки/видалення/CSV/меню/launcher);
  репак; `F:\OptiMax` синхронізовано (менеджер і launcher працюють і з копії на F:).
- 2026-10-16 (v1.3.0): теми оформлення — `ui/styles.css` (перехід на змінні + блоки `body.theme-gray|black`,
  `.theme-seg`), `core/store.js` (+theme), `main.js` (THEME_BG, theme у `i18n:get`, whitelist),
  `ui/app.js` (THEMES/applyTheme/themeLabel, рядок тем у Налаштуваннях, mock `?theme=`),
  5 локалей (+5 ключів → 297), `tools/check-ui.js` (+setTheme), `tests/store.test.js` (+theme);
  бампи 1.3.0 (package.json/index.html/mock); README/EULA/PRIVACY; репак 1.3.0; `F:\OptiMax`; скріншоти тем.
- 2026-10-16 (v1.4.0, «Порядок»): `order/tidy-desktop.ps1` і `order/tidy-downloads.ps1` — кошики
  створюються на місці (стіл / всередині «Завантажень») і тепер сортуються й **ярлики програм**
  (`Get-AppBucket`: WScript.Shell → TargetPath `.exe` → «Програми» / «Офісні програми»);
  ярлики на папки/сайти лишаються; `apps` у результаті; `tools/test-order.js` перероблено
  (справжні `.lnk` через COM) — 45/45 перевірок; локалі: нові описи задач ×5.
- 2026-10-16 (v1.4.0, безкоштовність): прибрано ліцензування — видалено `core/license.js`,
  `tools/make-license.js`, `tools/key-manager.js`, «Менеджер ключів.cmd», `tests/license.test.js`;
  `core/store.js` (без `license`/`usage`, спрощені merge/reset), `main.js` (без PRO-гейтингу
  `run:start`, без `license:*` IPC і `PURCHASE_URL`), `preload.js` (канали), `ui/index.html`
  (без чипа ліцензії та іконок i-key/i-lock/i-star/i-download; «· ER7 Studio» у сайдбарі),
  `ui/app.js` (без tier/локів/модалки/`fmtDate`), `ui/styles.css` (без license/locked/`--badge-pro-text`),
  локалі −27 ключів → **270×5**, нові тексти EULA та копірайту; `tools/check-ui.js`, тести (14/14),
  README, `docs/EULA.md` (розділ «Безкоштовно для всіх»), `docs/PRIVACY.md`;
  бампи 1.4.0; репак; копія `F:\OptiMax` (зайві файли прибрано вручну — robocopy не видаляє).
- 2026-10-16 (v1.4.0, open-source + переїзд): проєкт перенесено з `C:\Users\Enterprise\Desktop\OpenCode\optimax`
  на `F:\Робоча папка\Проекти\OptiMax` (дублікат `F:\OptiMax` видалено, ярлик перестворено в новому корені);
  код переструктуровано в `src/` (`main.js`, `preload.js`, `core/`, `ui/`) з оновленням усіх шляхів
  (`package.json` → `main`, ignore-патерни packager, `check-ui`, `serve-ui`, `check-ps-syntax`, tests, tools);
  додано OSS-обгортку: `LICENSE` (MIT), `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `.editorconfig`, `.gitattributes`, `.github/` (CI на windows-latest + шаблони issue/PR);
  нові npm-скрипти `verify`, `check:ui`, `check:ps`, `test:order`, `mock`, `site`; `tools/serve-site.js`;
  `site/` (преміум-лендінг, деплой на Vercel) і `marketing/` (матеріали для соцмереж);
  git-репозиторій ініціалізовано (гілка `main`, коміти), `.gitignore` виключає node_modules/release/.vercel;
  інструкції публікації (GitHub + Vercel, зокрема `vercel deploy --temporary` без акаунта) — `docs/DEPLOY.md`.
  Перевірки після переїзду: тести 14/14, check-ui 0 проблем, PS 39/39, пісочниця «Порядку» — усі OK,
  репак і димовий запуск exe — ОК (asar без site/docs/tools/tests).
- 2026-10-16 (деплой): лендінг опубліковано на Vercel — **https://optimax-ua.vercel.app**
  (проєкт `optimax-ua`, scope `er-7`; `site/.vercel/project.json`, `.vercel` у .gitignore).
  Вхід виконано через `vercel login` (device-flow, акаунт користувача). Імена `optimax`/`optima`
  глобально зайняті — Vercel додавав суфікси, тому взято `optimax-ua` (чиста адреса без суфікса);
  зайві проєкти (`optimax`, `optima`) видалено. Додано `tools/deploy-vercel.ps1`.
  Тимчасовий тунель trycloudflare (для перевірки до логіну) зупинено.
  Залишається: `git push` на GitHub (акаунта немає в середовищі) і публікація Instagram-поста.
