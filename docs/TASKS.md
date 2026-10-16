# TASKS — OptiMax

**Всього:** 30 · **Готово:** 30 · **В роботі:** 0

## v1.0 — ядро та реліз

## 1. ✅ Scaffold + docs — каркас, PRD/ARCHITECTURE/RULES/DESIGN/MEMORY
## 2. ✅ Core: store.js (settings/restore/logs/tmp), ps.js (PowerShell runner, консольні задачі, UAC-перевірка)
## 3. ✅ Каталог задач core/tasks.js — 31 задача, 4 категорії, 4 профілі, риски, admin/console-прапорці
## 4. ✅ PS-скрипти — 35 файлів (cleanup, perf, network, system, undo/restore, startup/list+toggle); синтаксис 35/35 OK
## 5. ✅ Runner — черга, прогрес, cancel, undo-записи, summary; stats.js (жива статистика), startup.js (StartupApproved)
## 6. ✅ UI — сайдбар, дашборд, категорії з чекбоксами, профілі, run-панель, живий лог, модалка результату, історія, автозапуск
## 7. ✅ main.js + preload.js — IPC (whitelist), single-instance, UAC-підвищення, консольні задачі у видимому вікні
## 8. ✅ Тести + перевірка — 9/9 node:test; реальні прогони (DNS, temp, undo round-trip); прогін у запакованому застосунку 30/30, 117.4 МБ
## 9. ✅ Пакування — release/OptiMax-win32-x64/OptiMax.exe (portable, asar); обхід extract-zip DLL, іконка + version info (resedit)
## 10. ✅ README + фінальні docs; правопис текстів UI перевірено (русизми прибрані)

## v1.1 — комерціалізація та локалізація

## 11. ✅ i18n — core/i18n.js + core/locales/{uk,en,pl,de,ru}.json (282 ключі × 5); фолбек locale→en→uk→ключ;
   data-i18n у HTML, localizedCatalog у main, зміна мови через reload
## 12. ✅ Ліцензування — core/license.js (OPTMX-ключі, HMAC-SHA256, тріал 7 днів від usage.firstRunAt),
   tools/make-license.js (`npm run keygen`), tests/license.test.js (7 тестів)
## 13. ✅ Тарифікація — FREE (safe + quick) / тріал (повний PRO) / PRO (усе); гейтинг у main `run:start`;
   UI: locked-картки з замком і PRO-бейджем, модалка активації, чип у топбарі, тости «Пропущено N PRO-задач»
## 14. ✅ Екран налаштувань — мова, економний режим (авто/увімк/вимк), інтервал статистики, підтвердження запуску,
   ліцензія (активувати/деактивувати/купити), дані (папка/журнали/скидання), EULA та Privacy модалки
## 15. ✅ Економний режим — автодетект ≤4 ядер / ≤6 ГБ RAM, CSS body.lite (без анімацій, тіней, градієнтів,
   backdrop-filter), Electron enable-low-end-device-mode; помітка «виявлено слабкий ПК»
## 16. ✅ Оновлення UI — нові іконки (gear/lock/key/globe тощо), чип ліцензії, стилі settings/license/locked/lite,
   виправлення: лічильники без locked-задач, PRO-бейдж профілів, порядок ініціалізації (i18n одразу, app:info пізніше)
## 17. ✅ Перевірки — тести 22/22; PS 35/35; tools/check-ui.js (282×5 ключів, 243 ключі коду, 43 data-i18n, 77 id — 0 проблем);
   mock-прогони (тріал/конфірм/налаштування/модалка/FREE-локи/EN-каталог); репак 1.1.0; 4 нові скріншоти
   (settings-uk, license-modal, free-locked, dashboard-en) + оновлений дашборд у реальному exe
## 18. ✅ Документи — docs/EULA.md (повна угода), docs/PRIVACY.md (офлайн, без збору даних);
   README: мови, ліцензування, демо-ключі, нові скріншоти, dev-команди; MEMORY/TASKS оновлено
## 19. ✅ Копія для розповсюдження — `F:\OptiMax` (robocopy, без node_modules) + ярлик «Запустити OptiMax.lnk»
   на `F:\OptiMax\release\OptiMax-win32-x64\OptiMax.exe`; на машині залишено активний тріал

## v1.2 — категорія «Порядок» (організація файлів)

## 20. ✅ Каталог + локалізація — 5-та категорія «Порядок», 4 задачі (робочий стіл / Завантаження / імена / фото),
   risk=medium → PRO (тріал бачить усе); nav + іконка `i-order`; 10 ключів × 5 мов (292); VIEWS/CATEGORY_VIEWS + mock
## 21. ✅ Скрипти — `order/tidy-desktop|downloads|names|photos.ps1` (PRELUDE `Get-UniquePath`/`Move-FileUndo`,
   undo kind `filemove`; ярлики, системні файли та свіжі завантаження не чіпаються); `restore.ps1` — обробка `filemove`
## 22. ✅ Перевірки та реліз — тести 22/22, PS 39/39, check-ui (292×5, 253 ключі коду, 44 data-i18n, 78 id — 0 проблем);
   пісочниця `tools/test-order.js` (13/13 файлів розкладено + undo round-trip); репак 1.2.0;
   скріншот order-uk; оновлення копії `F:\OptiMax`

## v1.2 — інструменти продавця

## 23. ✅ Менеджер ключів — `tools/key-manager.js` (меню + new/batch/list/check/export/note/remove), реєстр
   `keys/keys.json`, CSV для Excel; launcher «Менеджер ключів.cmd» (подвійний клік, автопошук node, ASCII-вміст);
   npm `keys`; README-розділ; перевірено: цикл у тимчасовому реєстрі, меню, launcher; репак; копія `F:\OptiMax`

## v1.3 — теми оформлення

## 24. ✅ Три теми — світла (типова) / сіра / чорна: CSS-змінні + `body.theme-*` (фон, панелі, модалки,
   бейджі, скролбар, чекбокси, перемикачі), `theme` у store/main/app + 5 локалей (297 ключів),
   перемикач зі свотчами в Налаштуваннях, mock `?theme=`, фон вікна під тему (THEME_BG);
   тести 22/22, check-ui 0 проблем; репак 1.3.0; скріншоти (theme-light/gray/black, settings-uk); копія `F:\OptiMax`

## v1.4 — безкоштовність і «Порядок» v2

## 25. ✅ Безкоштовно для всіх (ER7 Studio) — ліцензування прибрано повністю: `core/license.js`,
   `tools/make-license.js`, `tools/key-manager.js`, «Менеджер ключів.cmd», `tests/license.test.js`
   видалено; PRO-гейтинг у main і всі `license:*` IPC/канали; чип, модалка активації, локи, PRO-бейджі
   у UI; −27 ключів локалей (270×5); напис «ER7 Studio · безкоштовно для всіх» (сайдбар + Налаштування);
   README/EULA/PRIVACY переписано на безкоштовну модель
## 26. ✅ «Порядок» v2 — папки створюються просто на робочому столі та всередині «Завантажень»;
   сортуються і файли за типами, і **ярлики програм** (офісні → «Офісні програми», решта → «Програми»);
   ярлики на папки/сайти й системні значки не чіпаються; пісочниця `tools/test-order.js`
   зі справжніми `.lnk` (COM) — 45/45 перевірок із undo round-trip
## 27. ✅ Перевірки та реліз — тести 14/14, синтаксис PS 39/39, check-ui 0 розбіжностей
   (270×5; 231 ключ коду, 44 data-i18n, 74 id); репак 1.4.0; нові скріншоти; копія `F:\OptiMax`
   (зайві файли прибрано вручну — robocopy не видаляє)

## v1.4 — open-source, перенос і публікація

## 28. ✅ Перенос на F: + професійна структура — проєкт переїхав у `F:\Робоча папка\Проекти\OptiMax`
   (дублікат `F:\OptiMax` прибрано, ярлик у новому корені); код у `src/` (main/preload/core/ui)
   з оновленням усіх шляхів; packager ігнорує site/docs/tests/tools; перевірки й репак після переїзду — ОК
## 29. ✅ Open-source оформлення — MIT LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT,
   .editorconfig, .gitattributes, .github (CI + шаблони), коментарі-шапки в коді й тестах,
   git-репозиторій (гілка `main`) з першим комітом; npm-скрипти `verify/check:ui/check:ps/test:order/mock/site`
## 30. ✅ Лендінг і соцмережі — `site/` (преміум лендінг, статичний, `vercel.json`, `tools/serve-site.js`),
   `marketing/instagram/` (хук, текст поста, преміум-картинка 1080×1350 + сторіс), `docs/DEPLOY.md`
   (GitHub + Vercel, зокрема тимчасовий деплой без акаунта)
