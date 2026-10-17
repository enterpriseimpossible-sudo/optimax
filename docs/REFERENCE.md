# Довідник — структура, модулі, контракти

Документ описує **фактичний** стан коду: де що лежить, які модулі існують,
як передаються дані між шарами.

## 1. Карта тек

```
OptiMax/
├─ src/                        ← код застосунку (єдине джерело істини)
│  ├─ main.js                  Electron main: вікно, IPC, UAC, статистика
│  ├─ preload.js               contextBridge: білий список каналів IPC
│  ├─ core/
│  │  ├─ tasks.js              каталог 35 задач + 4 профілі (структура, без текстів)
│  │  ├─ runner.js             черга виконання, прогрес, скасування, збір undo
│  │  ├─ ps.js                 запуск PowerShell 5.1 + PRELUDE-хелпери
│  │  ├─ store.js              settings.json / restore.json / логи / tmp
│  │  ├─ i18n.js               локалізація (uk/en/pl/de/ru) + фолбек
│  │  ├─ stats.js              CPU/RAM (Node os) + диски/SMART (PowerShell)
│  │  ├─ startup.js            менеджер автозапуску (StartupApproved)
│  │  ├─ locales/*.json        270 ключів × 5 мов
│  │  └─ scripts/**.ps1        39 скриптів: cleanup/ order/ perf/ network/ system/ undo/ startup/
│  └─ ui/                      index.html, styles.css, js/ (9 класичних скриптів, без збірки)
├─ assets/                     icon.ico, icon.png
├─ tools/                      службові скрипти (перевірки, пісочниця, сервери, іконка)
├─ tests/                      node:test (tasks, store, runner, i18n) + smoke (tests/smoke) + e2e (tests/e2e)
├─ docs/                       ця документація + screens/
├─ site/                       лендінг (статичний, деплой на Vercel)
├─ release/                    результат `npm run package` (не в git)
└─ dist/                       релізний zip (не в git)
```

## 2. Модулі ядра

| Модуль | Відповідальність | Ключові експорти |
|---|---|---|
| `core/tasks.js` | Каталог задач і профілів — **єдине джерело правди** для структури | `TASKS`, `CATEGORIES`, `PROFILES`, `getTask(id)` |
| `core/runner.js` | Послідовна черга: запуск задач, події прогресу, скасування, накопичення undo-записів. Залежності (`ps`, `openExternal`) інжектуються через конструктор — для юніт-тестів | `Runner(store, deps)`, `run`, `cancel`, `runScript` |
| `core/ps.js` | Низькорівневий запуск PowerShell: прихований/консольний режим, `##RESULT##`-парсинг, `isAdmin` | `runPowerShell`, `runConsole`, `loadScript`, `isAdmin` |
| `core/store.js` | Стан застосунку: налаштування, журнал відкатів, логи, тимчасові файли | `Store`, `DEFAULT_SETTINGS` |
| `core/i18n.js` | Локалізація: словники, фолбек `<locale>→en→uk→ключ`, форматування оцінок часу | `t`, `dict`, `locales`, `setLocale`, `estimate`, `missingKeys` |
| `core/stats.js` | Живі метрики: CPU/RAM/uptime із Node, диски та SMART — через PowerShell (кеш ~15 с) | `Stats` |
| `core/startup.js` | Список автозапуску та перемикання (реєстр + папки автозавантаження) | `Startup` |
| `ui/js/*` | Інтерфейс, розбитий на 9 класичних скриптів (вантажаться з `file://`, тому без ES-модулів): `01-helpers` (стан, форматери, довідники) · `02-mock-api` (мок для браузера) · `03-shell` (локалізація статичного HTML, теми, навігація, шапка) · `04-dashboard` · `05-catalog` (профілі, категорії, виділення) · `06-run` (черга, підсумок, відкат) · `07-views` (автозапуск, історія, налаштування) · `08-ui-kit` (модалка, тости) · `99-boot` (API, `init()`, точка входу) | (модулі-сінглтони, спільний глобальний стан) |

## 3. IPC (місток renderer ↔ main)

Білий список — `src/preload.js` (усе інше відхиляється). 20 каналів:

| Канал | Призначення |
|---|---|
| `i18n:get` | словник, поточна мова, тема, список мов, лайт-режим |
| `tasks:get` | локалізований каталог (категорії, задачі, профілі) |
| `run:start`, `run:cancel` | запуск/скасування черги |
| `settings:get`, `settings:set`, `settings:reset` | налаштування (set приймає лише білий список ключів) |
| `stats:live` | CPU/RAM/диски на вимогу |
| `analyze:run` | аналіз обсягу сміття (лише читання) |
| `history:get`, `undo:run`, `undo:clear` | журнал відкатів і повернення змін |
| `logs:clear`, `data:open-folder` | очищення логів, відкриття папки даних |
| `startup:list`, `startup:toggle` | менеджер автозапуску |
| `app:info`, `app:relaunch-admin` | версія, права, перезапуск від адміністратора |
| `shell:open` | відкриття **лише з білого списку** (`ms-settings:…`) |
| *(push)* `stats:tick`, `run:event` | поточна статистика та події черги |

## 4. Схема задачі (`core/tasks.js`)

| Поле | Тип | Значення |
|---|---|---|
| `id` | string | унікальний ідентифікатор (напр. `clean_temp_user`) |
| `category` | string | `cleanup` / `order` / `perf` / `network` / `system` |
| `risk` | string | `safe` / `medium` / `advanced` (впливає на підтвердження) |
| `admin` | bool | чи потрібні права адміністратора |
| `reversible` | bool | чи є undo-записи |
| `estMinutes` | number | орієнтовний час (для підсумку) |
| `default` | bool | чи увімкнена в типовому наборі |
| `profiles` | string[] | у яких профілях бере участь (`quick`, `deep`, `gaming`, `full`) |
| `script` \| `uri` | string | відносний шлях до `.ps1` **або** системний URI |
| `console`, `reboot`, `timeoutMs` | bool/number | особливості виконання |

**Каталог:** 35 задач — cleanup 10, order 4, perf 10, network 6, system 5; профілі: quick 9, deep 10, gaming 8, full 17.

## 5. Контракт PowerShell-скрипта

1. Скрипт друкує довільні рядки — вони потрапляють у живий лог.
2. Останній рядок: `##RESULT## {…}` у JSON:
   ```json
   { "ok": true, "message": "текст для UI", "freedBytes": 0, "undo": [], "details": {} }
   ```
3. `undo[]` — записи для відкату. Підтримувані `kind` (обробляє `scripts/undo/restore.ps1`):
   `reg`, `service`, `powerplan`, `dns`, `task`, `hibernate`, `netsh-tcp`, `filemove`.
4. Консольні задачі (`console: true`) відкриваються у видимому вікні; черга чекає закриття.
5. Хелпери з `PRELUDE` (`core/ps.js`): `Emit-Result`, `Fmt-Bytes`, `Remove-Contents`,
   `Get-RegValue`, `New-UndoReg`, `Set-RegDword`, `Set-RegString`, `Get-UniquePath`, `Move-FileUndo`.

Службові змінні середовища (для тестів/інструментів, у продакшені не задаються):
`OPTIMAX_ORDER_ROOT` (підміна кореневої теки для пісочниці «Порядку»),
`OPTIMAX_PAYLOAD_FILE` (файл із undo-записами для `restore.ps1`).

## 6. Файли даних

Папка: `%APPDATA%\OptiMax\`

| Файл | Вміст |
|---|---|
| `settings.json` | `checked`, `lastView`, `locale`, `theme`, `liteMode`, `statsIntervalSec`, `confirmRun` |
| `restore.json` | журнал undo-записів (`items[]` + `updated`) |
| `logs/optimax-YYYY-MM-DD.log` | логи виконання (3 останні дні читаються в UI) |
| `tmp/` | тимчасові файли (payload для відкату) |

Скидання: «Налаштування → Дані → Скинути налаштування» (очищає `checked` і повертає типові значення).

## 7. Локалізація

- Ключі: `nav.*`, `view.*`, `task.<id>.t` / `task.<id>.d`, `profile.*`, `badge.*`, `msg.*`, `settings.*`, `eula.*`, `privacy.*`, `unit.*`, `risk.*`.
- Фолбек: `поточна мова → en → uk → сам ключ`.
- Паритет словників перевіряє `npm run check:ui` (усі 5 мов мусять мати однаковий набір ключів).
- Статичний HTML локалізується через `data-i18n` / `data-i18n-title`; каталог задач локалізує main.

## 8. Інструменти (`tools/`)

| Файл | Призначення |
|---|---|
| `check-ui.js` | цілісність локалей, ключів i18n, `id` елементів UI |
| `check-js.js` | JS-гейт: синтаксис, заборона «сирого» `console.*` у `src/` і `tools/`, шапки-коментарі, маркери конфліктів, валідність JSON, шляхи зі скриптів `package.json` |
| `lib/log.js` | спільний логер інструментів: `log()`/`logWarn()` глушаться змінною `OPTIMAX_QUIET=1`, `logError()` — завжди |
| `check-ps-syntax.ps1` | синтаксис усіх `.ps1` |
| `test-order.js` | пісочниця «Порядку» (переміщення + undo round-trip) |
| `run-task.js`, `run-script.js` | ручний прогін задачі/скрипта як у застосунку |
| `serve-ui.js`, `serve-site.js` | локальні сервери (мок UI / лендінг) |
| `make-icon.ps1`, `embed-icon.js` | генерація іконки та вшивання іконки/версії в exe |
| `make-release-zip.ps1` | релізний архів `dist/OptiMax-<версія>-win-x64.zip` + SHA256 (викликається через `npm run release`) |
| `shot.ps1`, `capture.ps1`, `click.ps1`, `scroll.ps1`, `sendkey.ps1` | керування вікном і скріншоти для документації |
| `patch-settings.js`, `write-undo-payload.js` | демо-стани та ручна перевірка відкату |
| `deploy-vercel.ps1` | деплой лендінга на Vercel (`npx vercel --prod` у теці `site/`) |
| `make-shortcut.ps1` | ярлик «OptiMax» на робочому столі (`npm run shortcut`, після `npm run package`) |

## 9. Скріншоти документації

`docs/screens/` (дзеркальні копії — у `site/assets/`, крім favicon) мають схему імен
`<екран>[-<мова|тема>].webp`: `dashboard`, `run-in-progress`, `run-result`, `settings-uk`,
`order-uk`, `about-uk`, `dashboard-en`, `theme-gray`, `theme-black`. Формат — **WebP**
(конвертація: `tools/optimize-images.js`, економія ~66%).

Перемалювати знімки: `tools/shot.ps1` (за потреби з `tools/click.ps1` / `tools/scroll.ps1`),
потім оновити бази візуального тесту — `npm run test:visual -- --update`.

## 10. Історія змін структури

Матеріали для соцмереж (`marketing/instagram/`: карусель, сторіс, тексти, скрипти публікації)
існували в проєкту до 2026-10-17 і були **видалені** (див. ADR-014) — публікацію завершено,
потреба відпала. За потреби їх можна відновити з історії git.
