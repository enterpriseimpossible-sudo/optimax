# Деплой і публікація — OptiMax

У цьому файлі — як опублікувати код на GitHub і викласти лендінг на Vercel.
Обидві дії потребують ваших акаунтів (їх немає в проєкті й не може бути).

## 0. Що вже готово в репозиторії

- Git-репозиторій ініціалізовано, гілка — `main`, зроблено перший коміт.
- `.gitignore` виключає `node_modules/`, `release/`, `.vercel`, локальні ярлики та секрети.
- CI (`.github/workflows/ci.yml`) запускає тести, перевірку локалей/UI і синтаксис PowerShell.
- Лендінг лежить у `site/` (статичний, без збірки).

## 1. GitHub

**Уже опубліковано:** https://github.com/enterpriseimpossible-sudo/optimax (публічний, MIT,
топіки: windows · optimizer · electron · powershell · freeware · cleanup · ukrainian,
домашня сторінка проєкту = лендінг Vercel).

### Інструмент

У системі встановлено GitHub CLI (без PATH, викликати повним шляхом):

```powershell
$gh = "$env:LOCALAPPDATA\ER7\gh\gh.exe"
& $gh auth status          # має бути: repo, workflow
& $gh repo view --web      # відкрити репозиторій
```

Потрібні scopes: **`repo`** і **`workflow`** (останній — щоб пушити `.github/workflows/ci.yml`).
Якщо бракує: `& $gh auth refresh -h github.com -s workflow` (device-flow, підтвердити в браузері).

### Первинна публікація (що вже зроблено)

```powershell
git remote add origin https://github.com/<логін>/optimax.git
& $gh auth setup-git        # git використовує gh як credential helper
git push -u origin main
```

### Новий реліз

```powershell
npm run release             # перезбірка + dist\OptiMax-<версія>-win-x64.zip + SHA256
& $gh release create v<версія> "dist\OptiMax-<версія>-win-x64.zip" `
  --title "OptiMax <версія> — безкоштовний оптимізатор Windows" `
  --notes-file docs/release-notes-v<версія>.md
```

> Якщо у новому релізі зміниться **назва файлу архіву**, оновіть `DOWNLOAD_URL`
> у `site/script.js` (кнопка «Завантажити» веде на
> `.../releases/latest/download/<ім'я файлу>`) і перезадеплойте сайт.

Далі — реліз застосунку як asset (файли збірки у git не потрапляють через ліміт 100 МБ):

```powershell
npm run release      # = npm run package:vc (пакування + VC++ DLL) + стиснення + SHA256
# поточний архів: dist\OptiMax-1.4.1-win-x64.zip (105.9 МБ)
# SHA256: F0F4B2537E1E79843ABA8AC247623ACA55EE8A58114D41B2EF09B9072CA7B882
# GitHub → Releases → Draft a new release → tag v1.4.1 → прикріпіть цей zip
# нотатки релізу: docs/release-notes-v1.4.1.md
# ✅ v1.4.1 опубліковано 2026-10-17 (Latest) командою:
#    gh release create v1.4.1 "dist\OptiMax-1.4.1-win-x64.zip" --title "OptiMax 1.4.1 — технічний реліз" --notes-file docs\release-notes-v1.4.1.md
```

> `npm run release` тепер використовує `package:vc`, тому в архіві завжди є VC++ DLL
> (потрібні для майбутнього Electron 43+; для Electron 31 вони просто лежать поряд і не заважають).

Після створення релізу замініть у `site/script.js` змінну `DOWNLOAD_URL` на
`https://github.com/<ВАШ_ЛОГІН>/optimax/releases/latest` — кнопки «Завантажити» почнуть вести на релізи.

## 2. Vercel

**Уже задеплоєно:** 🌐 **https://optimax-ua.vercel.app** — проєкт `optimax-ua` (scope `er-7`),
лендінг лежить у `site/`, привʼязаний через `site/.vercel/project.json`.

Передеплой після правок сайту:

```powershell
powershell -ExecutionPolicy Bypass -File tools\deploy-vercel.ps1   # або:
cd site; npx vercel --prod --yes
```

### Новий/інший проєкт (коротка адреса `<назва>.vercel.app`)

```powershell
npx --yes vercel login                          # один раз
npx --yes vercel project create optimax-ua      # назва = майбутня адреса (якщо вільна)
cd site; npx --yes vercel link --yes --project optimax-ua; npx --yes vercel --prod --yes
```

Якщо імʼя вже зайняте кимось у світі, Vercel додасть суфікс (`<назва>-<щось>.vercel.app`) —
обирайте іншу коротку назву.

### Варіант B — тимчасовий публічний URL без акаунта

```powershell
npx --yes vercel deploy site --temporary --yes
```

Такий деплой захищений авторизацією Vercel і для сторонніх не відкривається — лише для перевірки.

## 3. Після деплою

- У `site/script.js` замініть `DOWNLOAD_URL` на посилання GitHub Releases
  (`https://github.com/<ВАШ_ЛОГІН>/optimax/releases/latest`).
- За потреби додайте власний домен у Vercel (Settings → Domains).
- Перевірте текст і посилання у футері лендінга.

## 4. Локальний перегляд лендінга

```powershell
npm run site      # http://127.0.0.1:8902/
```
