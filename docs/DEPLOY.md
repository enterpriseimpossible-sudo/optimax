# Деплой і публікація — OptiMax

У цьому файлі — як опублікувати код на GitHub і викласти лендінг на Vercel.
Обидві дії потребують ваших акаунтів (їх немає в проєкті й не може бути).

## 0. Що вже готово в репозиторії

- Git-репозиторій ініціалізовано, гілка — `main`, зроблено перший коміт.
- `.gitignore` виключає `node_modules/`, `release/`, `.vercel`, локальні ярлики та секрети.
- CI (`.github/workflows/ci.yml`) запускає тести, перевірку локалей/UI і синтаксис PowerShell.
- Лендінг лежить у `site/` (статичний, без збірки).

## 1. GitHub

```powershell
# 1) створіть ПУСТИЙ репозиторій на github.com (без README) — назва, напр. optimax
# 2) підключіть і надішліть:
git remote add origin https://github.com/<ВАШ_ЛОГІН>/optimax.git
git push -u origin main
```

Під час першого `push` Git запитає вхід: логін + **Personal Access Token**
(Settings → Developer settings → Personal access tokens → Fine-grained, права `Contents: Read and write`)
або скористайтесь менеджером облікових даних, якщо він увімкнений.

Далі — реліз застосунку як asset (файли збірки у git не потрапляють через ліміт 100 МБ):

```powershell
npm run release      # = npm run package + стиснення у dist\OptiMax-<версія>-win-x64.zip + друк SHA256
# поточний архів: dist\OptiMax-1.4.0-win-x64.zip (105.6 МБ)
# SHA256: 4BB9CFF08FC94B3C7B6F0AD0A630F48627D9F84B20641B8E0E701022F86BE387
# GitHub → Releases → Draft a new release → tag v1.4.0 → прикріпіть цей zip
```

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
