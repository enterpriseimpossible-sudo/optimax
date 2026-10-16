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
│  └─ ui/                      index.html, styles.css, app.js (vanilla, без збірки)
├─ assets/                     icon.ico, icon.png
├─ tools/                      службові скрипти (перевірки, пісочниця, сервери, іконка)
├─ tests/                      node:test (tasks, store, i18n)
├─ docs/                       ця документація + screens/
├─ site/                       лендінг (статичний, деплой на Vercel)
├─ marketing/instagram/        контент для соцмереж + automation (окремий мініпроєкт)
├─ release/                    результат `npm run package` (не в git)
└─ dist/                       релізний zip (не в git)
```

## 2. Модулі ядра

| Модуль | Відповідальність | Ключові експорти |
|---|---|---|
| `core/tasks.js` | Каталог задач і профілів — **єдине джерело правди** для структури | `TASKS`, `CATEGORIES`, `PROFILES`, `getTask(id)` |
| `core/runner.js` | Послідовна черга: запуск задач, події прогресу, скасування, накопичення undo-записів | `Runner` (`run`, `cancel`, `runScript`) |
| `core/ps.js` | Низькорівневий запуск PowerShell: прихований/консольний режим, `##RESULT##`-парсинг, `isAdmin` | `runPowerShell`, `runConsole`, `loadScript`, `isAdmin` |
| `core/store.js` | Стан застосунку: налаштування, журнал відкатів, логи, тимчасові файли | `Store`, `DEFAULT_SETTINGS` |
| `core/i18n.js` | Локалізація: словники, фолбек `<locale>→en→uk→ключ`, форматування оцінок часу | `t`, `dict`, `locales`, `setLocale`, `estimate`, `missingKeys` |
| `core/stats.js` | Живі метрики: CPU/RAM/uptime із Node, диски та SMART — через PowerShell (кеш ~15 с) | `Stats` |
| `core/startup.js` | Список автозапуску та перемикання (реєстр + папки автозавантаження) | `Startup` |
| `ui/app.js` | Увесь інтерфейс: стан, рендер, обробники, mock-API для браузера | (модуль-сінглтон) |

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
| `check-js.js` | JS-гейт: синтаксис, заборонені `console.log` у `src/`, маркери конфліктів, валідність JSON |
| `check-ps-syntax.ps1` | синтаксис усіх `.ps1` |
| `test-order.js` | пісочниця «Порядку» (переміщення + undo round-trip) |
| `run-task.js`, `run-script.js` | ручний прогін задачі/скрипта як у застосунку |
| `serve-ui.js`, `serve-site.js` | локальні сервери (мок UI / лендінг) |
| `make-icon.ps1`, `embed-icon.js` | генерація іконки та вшивання іконки/версії в exe |
| `make-release-zip.ps1` | релізний архів `dist/OptiMax-<версія>-win-x64.zip` + SHA256 (викликається через `npm run release`) |
| `shot.ps1`, `capture.ps1`, `click.ps1`, `scroll.ps1`, `sendkey.ps1` | керування вікном і скріншоти для документації |
| `patch-settings.js`, `write-undo-payload.js` | демо-стани та ручна перевірка відкату |
| `publish.ps1`, `deploy-vercel.ps1` | публікація (GitHub + Vercel) |

## 9. Контент і автоматизація (`marketing/instagram/`)

- `carousel/` — 10 слайдів 1080×1350 (+ `carousel.css`, `img/`), рендер: `tools/render-carousel.js`.
- `stories/` — сторіс 1080×1920 (+ `stories.css`, `img/`, `descriptions.md`), рендер: `tools/render-stories.js`.
- `captions/` — тексти постів 4 мовами.
- `templates/` — спільний стиль і шаблони першої ітерації.
- `automation/` — **окремий мініпроєкт** (власний `package.json`, `playwright-core`): скрипти публікації
  та перевірок Instagram. Сесія — `automation/state/auth.json` (у git не потрапляє).
