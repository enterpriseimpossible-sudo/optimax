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
npm run package
Compress-Archive -Path release\OptiMax-win32-x64\* -DestinationPath OptiMax-1.4.0-win-x64.zip
# GitHub → Releases → Draft a new release → прикріпіть zip
```

## 2. Vercel

### Варіант A — тимчасовий публічний URL без акаунта (швидко, діє обмежений час)

```powershell
npx --yes vercel deploy site --temporary --yes
```

Vercel CLI надрукує публічну адресу. Такий деплой можна пізніше «забрати» під свій акаунт.

### Варіант B — постійний деплой (потрібен акаунт Vercel)

```powershell
npx --yes vercel login          # один раз: вхід у браузері або токен
npx --yes vercel --prod site    # production-деплой лендінга
```

Або через дашборд: **Add New → Project → Import** ваш GitHub-репозиторій, а в налаштуваннях
проєкту вкажіть **Root Directory = `site`** (Framework Preset: *Other*, Build Command — порожній).
Тоді кожен `git push` у `main` автоматично оновлює сайт.

## 3. Після деплою

- У `site/script.js` замініть `DOWNLOAD_URL` на посилання GitHub Releases
  (`https://github.com/<ВАШ_ЛОГІН>/optimax/releases/latest`).
- За потреби додайте власний домен у Vercel (Settings → Domains).
- Перевірте текст і посилання у футері лендінга.

## 4. Локальний перегляд лендінга

```powershell
npm run site      # http://127.0.0.1:8902/
```
