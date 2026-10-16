# Як долучитися до OptiMax

Дякуємо за інтерес! OptiMax — безкоштовний відкритий застосунок для оптимізації Windows.
Ми раді баг-репортам, пропозиціям і pull request'ам.

## Швидкий старт для розробника

```powershell
npm install        # один раз
npm start          # запуск у dev-режимі (Electron)
npm test           # юніт-тести (node:test)
npm run verify     # усі перевірки: тести + цілісність UI + синтаксис PowerShell
```

Збірка portable-версії:

```powershell
npm run package    # іконка → electron-packager → вшивання іконки/версії
# результат: release\OptiMax-win32-x64\OptiMax.exe
```

Перегляд UI у звичайному браузері (мок-режим, без Electron):

```powershell
npm run mock       # http://127.0.0.1:8899/src/ui/index.html
```

## Структура

```
src/main.js, src/preload.js   Electron: вікно, IPC (whitelist каналів), single-instance, UAC
src/core/tasks.js             каталог задач (єдине джерело правди) + профілі
src/core/runner.js            черга задач, прогрес, скасування, undo-записи, підсумок
src/core/ps.js                запуск PowerShell 5.1 + PRELUDE-хелпери
src/core/store.js             settings.json / restore.json / логи
src/core/i18n.js              локалізація (5 мов)
src/core/locales/*.json       словники (270 ключів кожен)
src/core/scripts/*.ps1        скрипти задач (cleanup/ order/ perf/ network/ system/ undo/ startup/)
src/ui/*                      інтерфейс (vanilla HTML/CSS/JS + мок-режим)
tools/*                       допоміжні скрипти (перевірки, пісочниця, сервер, іконка)
tests/*                       node:test
docs/*                        документація (PRD, архітектура, EULA, скріншоти)
site/*                        лендінг-сторінка продукту
```

## Як додати нову задачу

1. **Каталог** — додайте запис у `src/core/tasks.js` (`id`, `category`, `risk`, `admin`,
   `reversible`, `estMinutes`, `profiles`, `script` або `uri`).
2. **Скрипт** — створіть `src/core/scripts/<категорія>/<назва>.ps1`. Контракт:
   - використовуйте хелпери з `PRELUDE` (`Remove-Contents`, `Set-RegDword`, `New-UndoReg`, `Move-FileUndo`…);
   - у кінці обов'язково викликайте `Emit-Result @{ ok = $true; message = '...'; freedBytes = 0; undo = $undo }`;
   - повертайте undo-записи для кожної зміни, яку можна відкотити.
3. **Локалізація** — додайте `task.<id>.t` і `task.<id>.d` у **всі п'ять** словників
   (`src/core/locales/uk|en|pl|de|ru.json`). Паритет мов перевіряє `npm run check:ui`.
4. **Перевірка** — `npm run verify`. Для файлових задач — пісочниця `npm run test:order`.

## Стиль коду

- Усталений стиль проєкту: `'use strict'`, 2 пробіли, одинарні лапки, крапка з комою.
- Назви файлів — `kebab-case`, модулі експортують явні імена (`module.exports = { ... }`).
- Коментарі та UI-тексти — українською (локалі додатково англійською/польською/німецькою/російською).
- Не додавайте залежностей без потреби: застосунок працює на чистих Electron + PowerShell.

## Pull request

1. Форкніть репозиторій і створіть гілку від `main`.
2. Тримайте зміну вузькою: одна задача/фікс — один PR.
3. Перед відкриттям PR запустіть `npm run verify` (і `npm run test:order`, якщо це «Порядок»).
4. Опишіть у PR: що змінилось, навіщо, як перевірили (кроки + результат).
5. Якщо змінюєте UI — додайте скріншот до/після.

## Баг-репорти

Створюйте issue за шаблоном: кроки відтворення, очікуваний і фактичний результат,
версія OptiMax, версія Windows, чи запущено від адміністратора.

---

### English (short)

OptiMax is a free, open-source Windows optimizer (Electron + PowerShell).
Run `npm install`, `npm start`, `npm test`; `npm run verify` runs all checks.
Add a task by editing `src/core/tasks.js`, adding a PowerShell script in
`src/core/scripts/` that ends with `Emit-Result`, and localizing
`task.<id>.t` / `task.<id>.d` in all five locale files. PRs are welcome.
