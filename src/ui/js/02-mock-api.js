'use strict';
/* UI · мок-API
   Підміняє window.optima у браузері (npm run mock), коли preload недоступний.
   (частина колишнього app.js; порядок завантаження задає index.html) */
// ---------------- mock (перегляд UI у звичайному браузері) ----------------
function createMockApi() {
  const params = new URLSearchParams(location.search);
  if (params.get('theme')) localStorage.setItem('optimax-theme', params.get('theme'));

  const listeners = {};
  const emit = (ch, payload) => (listeners[ch] || []).forEach((fn) => fn(payload));
  const admin = params.get('noadmin') !== '1';

  const getLang = () => localStorage.getItem('optimax-lang') || 'uk';
  const localeList = [
    { code: 'uk', title: 'Українська' },
    { code: 'en', title: 'English' },
    { code: 'pl', title: 'Polski' },
    { code: 'de', title: 'Deutsch' },
    { code: 'ru', title: 'Русский' }
  ];
  const dictOf = () => (window.__OPTIMAX_LOCALES__ && window.__OPTIMAX_LOCALES__[getLang()]) || {};
  const tt = (key, fb) => {
    const v = dictOf()[key];
    return v !== undefined ? v : fb;
  };
  const ensureLocales = () => new Promise((resolve) => {
    if (window.__OPTIMAX_LOCALES__ || !/^https?:/.test(location.protocol)) return resolve();
    const s = document.createElement('script');
    s.src = 'locales.js';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });

  const defs = [
    { id: 'clean_temp_user', category: 'cleanup', risk: 'safe', admin: false, reversible: false, est: 1.5, fbT: 'Тимчасові файли користувача', fbD: 'Очищає теку %TEMP% — залишки інсталяторів, кеші програм.' },
    { id: 'clean_recycle', category: 'cleanup', risk: 'safe', admin: false, reversible: false, est: 0.5, fbT: 'Кошик', fbD: 'Остаточно видаляє вміст кошика на всіх дисках.' },
    { id: 'clean_updates', category: 'cleanup', risk: 'medium', admin: true, reversible: false, est: 3, fbT: 'Кеш Windows Update', fbD: 'Видаляє завантажені пакети оновлень.' },
    { id: 'clean_winsxs', category: 'cleanup', risk: 'medium', admin: true, reversible: false, est: 20, console: true, fbT: 'Очищення WinSxS (DISM)', fbD: 'DISM /StartComponentCleanup — видаляє старі компоненти.' },
    { id: 'perf_power_ultimate', category: 'perf', risk: 'safe', admin: true, reversible: true, est: 0.2, fbT: 'План «Максимальна продуктивність»', fbD: 'Вмикає Ultimate Performance.' },
    { id: 'perf_telemetry_off', category: 'perf', risk: 'medium', admin: true, reversible: true, est: 0.5, fbT: 'Телеметрія Windows', fbD: 'Вимикає DiagTrack та задачі збору даних.' },
    { id: 'perf_gpu_sched', category: 'perf', risk: 'advanced', admin: true, reversible: true, est: 0.2, reboot: true, fbT: 'Апаратне планування GPU', fbD: 'HwSchMode=2 — менша затримка кадрів.' },
    { id: 'net_dns_flush', category: 'network', risk: 'safe', admin: false, reversible: false, est: 0.1, fbT: 'Очистити кеш DNS', fbD: 'Скидає кеш DNS та NetBIOS.' },
    { id: 'net_nagle_off', category: 'network', risk: 'advanced', admin: true, reversible: true, est: 0.2, fbT: 'Вимкнути алгоритм Nagle', fbD: 'TCPNoDelay=1 — менший пінг.' },
    { id: 'sys_restore_point', category: 'system', risk: 'safe', admin: true, reversible: false, est: 1, fbT: 'Точка відновлення', fbD: 'Checkpoint-Computer перед змінами.' },
    { id: 'sys_sfc', category: 'system', risk: 'advanced', admin: true, reversible: false, est: 12, console: true, fbT: 'Перевірка SFC', fbD: 'sfc /scannow у вікні консолі.' },
    { id: 'sys_update_open', category: 'system', risk: 'safe', admin: false, reversible: false, est: 0.1, fbT: 'Відкрити Центр оновлення', fbD: 'Перехід до ms-settings:windowsupdate.' },
    { id: 'order_desktop', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1, fbT: 'Порядок на робочому столі', fbD: 'Розкладає файли з робочого столу по папках типів.' },
    { id: 'order_downloads', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1.5, fbT: 'Порядок у Завантаженнях', fbD: 'Сортує старі файли зі «Завантажень» за типом.' },
    { id: 'order_names', category: 'order', risk: 'medium', admin: false, reversible: true, est: 2, fbT: 'Охайні імена файлів', fbD: 'Прибирає подвійні та зайві пробіли в іменах файлів.' },
    { id: 'order_photos', category: 'order', risk: 'medium', admin: false, reversible: true, est: 1.5, fbT: 'Фото та відео за роками', fbD: 'Переносить зображення та відео у підпапки за роками.' }
  ];

  const mockEstimate = (m) => m < 1
    ? tt('est.sec', '{n} с').replace('{n}', String(Math.max(5, Math.round((m * 60) / 5) * 5)))
    : tt('est.min', '{n} хв').replace('{n}', String(Math.round(m)));

  const buildTasks = () => defs.map((d) => ({
    id: d.id, category: d.category, risk: d.risk,
    admin: d.admin, reversible: d.reversible, estMinutes: d.est,
    default: d.risk === 'safe', profiles: ['quick'],
    console: !!d.console, reboot: !!d.reboot,
    title: tt(`task.${d.id}.t`, d.fbT), desc: tt(`task.${d.id}.d`, d.fbD),
    estimate: mockEstimate(d.est)
  }));

  const buildCatalog = () => ({
    categories: [
      { id: 'cleanup', icon: 'i-broom', title: tt('nav.cleanup', 'Очищення'), sub: tt('view.cleanup.sub', 'Сміття, кеші, тимчасові файли') },
      { id: 'order', icon: 'i-order', title: tt('nav.order', 'Порядок'), sub: tt('view.order.sub', 'Робочий стіл, Завантаження та файли — у лад') },
      { id: 'perf', icon: 'i-gauge', title: tt('nav.perf', 'Продуктивність'), sub: tt('view.perf.sub', 'Плани живлення, служби, твіки') },
      { id: 'network', icon: 'i-wifi', title: tt('nav.network', 'Мережа'), sub: tt('view.network.sub', 'DNS, TCP, ігрові мережеві твіки') },
      { id: 'system', icon: 'i-shield', title: tt('nav.system', 'Система'), sub: tt('view.system.sub', 'Обслуговування та діагностика') }
    ],
    tasks: buildTasks(),
    profiles: ['quick', 'deep', 'gaming', 'full'].map((id) => ({
      id,
      title: tt(`profile.${id}`, id),
      sub: tt(`profile.${id}.sub`, '')
    }))
  });

  setInterval(() => {
    emit('stats:tick', {
      live: { cpu: 8 + Math.round(Math.random() * 40), cores: 8, ramUsed: (9 + Math.random() * 3) * 1024 ** 3, ramTotal: 32 * 1024 ** 3, uptimeSec: 3 * 86400 + 7200, host: 'OPTIMAX-DEMO' },
      disks: {
        volumes: [
          { letter: 'C:', label: 'System', fs: 'NTFS', size: 510 * 1024 ** 3, free: 122 * 1024 ** 3 },
          { letter: 'F:', label: 'Data', fs: 'NTFS', size: 1900 * 1024 ** 3, free: 940 * 1024 ** 3 }
        ],
        physical: [
          { model: 'Samsung SSD 990 PRO 1TB', media: 'SSD', health: 'Healthy', bus: 'NVMe', size: 1024 ** 4 },
          { model: 'Seagate Barracuda 2TB', media: 'HDD', health: 'Healthy', bus: 'SATA', size: 2 * 1024 ** 4 }
        ]
      }
    });
  }, 2000);

  return {
    invoke: async (channel, ...args) => {
      switch (channel) {
        case 'i18n:get': {
          await ensureLocales();
          const lang = getLang();
          const all = window.__OPTIMAX_LOCALES__ || {};
          return {
            locale: lang,
            locales: localeList,
            dict: all[lang] || all.uk || {},
            version: '1.4.1-demo',
            lite: false,
            theme: localStorage.getItem('optimax-theme') || 'light',
            liteMode: localStorage.getItem('optimax-lite') || 'auto'
          };
        }
        case 'tasks:get': return buildCatalog();
        case 'settings:get': return {
          checked: {},
          lastView: 'dashboard',
          locale: getLang(),
          theme: localStorage.getItem('optimax-theme') || 'light',
          liteMode: localStorage.getItem('optimax-lite') || 'auto',
          statsIntervalSec: 2,
          confirmRun: 'risky'
        };
        case 'settings:set':
          if (args[0] && args[0].locale) localStorage.setItem('optimax-lang', args[0].locale);
          if (args[0] && args[0].theme) localStorage.setItem('optimax-theme', args[0].theme);
          if (args[0] && args[0].liteMode !== undefined) localStorage.setItem('optimax-lite', String(args[0].liteMode));
          return true;
        case 'settings:reset':
          localStorage.removeItem('optimax-lang');
          localStorage.removeItem('optimax-theme');
          localStorage.removeItem('optimax-lite');
          return true;
        case 'app:info': return { admin, version: '1.4.1-demo', platform: 'win32', userData: '%APPDATA%\\OptiMax (демо)', lite: false };
        case 'stats:live': return { live: { cpu: 12, cores: 8, ramUsed: 10 * 1024 ** 3, ramTotal: 32 * 1024 ** 3, uptimeSec: 180000, host: 'OPTIMAX-DEMO' }, disks: null };
        case 'analyze:run': return {
          ok: true, details: {
            categories: [
              { id: 'clean_temp_user', label: tt('task.clean_temp_user.t', 'Тимчасові файли користувача'), bytes: 1.9 * 1024 ** 3 },
              { id: 'clean_updates', label: tt('task.clean_updates.t', 'Кеш Windows Update'), bytes: 5.2 * 1024 ** 3 },
              { id: 'clean_recycle', label: tt('task.clean_recycle.t', 'Кошик'), bytes: 0.8 * 1024 ** 3 },
              { id: 'clean_browser', label: tt('task.clean_browser.t', 'Кеш браузерів'), bytes: 1.1 * 1024 ** 3 },
              { id: 'clean_crashdumps', label: tt('task.clean_crashdumps.t', 'Дампи та звіти помилок'), bytes: 0.4 * 1024 ** 3 }
            ], total: 9.4 * 1024 ** 3
          }
        };
        case 'history:get': return { items: [], updated: null, log: '[19:01:01] [info] [run] Старт: 9 задач, адмін=true\n[19:02:14] [ok] [clean_temp_user] Видалено об\'єктів: 128, пропущено: 4 (звільнено 1.9 ГБ)\n[19:02:40] [ok] [run] Завершено. Звільнено: 9.4 ГБ' };
        case 'logs:clear': return { ok: true, removed: 3 };
        case 'data:open-folder': return { ok: true };
        case 'startup:list': return [
          { name: 'OneDrive', command: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe /background', source: 'Реєстр', enabled: true, kind: 'reg', hive: 'HKCU', approvedHive: 'HKCU', approvedSub: 'x' },
          { name: 'Discord', command: 'C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe', source: 'Реєстр', enabled: true, kind: 'reg', hive: 'HKCU', approvedHive: 'HKCU', approvedSub: 'x' },
          { name: 'Steam', command: '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent', source: 'Реєстр (32-біт)', enabled: false, kind: 'reg', hive: 'HKLM', approvedHive: 'HKLM', approvedSub: 'x' },
          { name: 'Teams.lnk', command: 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Teams.lnk', source: 'Папка автозавантаження', enabled: true, kind: 'file', hive: 'HKLM', approvedHive: 'HKLM', approvedSub: 'x' }
        ];
        case 'startup:toggle': return { ok: true, name: args[0] && args[0].name, action: args[1] };
        case 'run:start': {
          const ids = args[0] || [];
          const nowTasks = buildTasks();
          const total = ids.length;
          setTimeout(() => emit('run:event', { type: 'start', payload: { total } }), 60);
          let i = 0;
          const step = () => {
            if (i >= ids.length) {
              emit('run:event', {
                type: 'done', payload: {
                  results: ids.map((id) => {
                    const task = nowTasks.find((x) => x.id === id);
                    return { id, title: task ? task.title : id, status: 'ok', message: `${tt('msg.ok', 'Виконано')} · demo`, freedBytes: Math.random() > .5 ? 1.2 * 1024 ** 3 : 0, undoCount: Math.random() > .6 ? 1 : 0 };
                  }),
                  freedTotal: 9.4 * 1024 ** 3, freedText: `9.4 ${tt('unit.gb', 'ГБ')}`, cancelled: false
                }
              });
              return;
            }
            const id = ids[i];
            const task = nowTasks.find((x) => x.id === id);
            emit('run:event', { type: 'task', payload: { id, title: task ? task.title : id, index: i + 1, total, status: 'running', message: tt('run.executing', 'виконується…') } });
            setTimeout(() => {
              emit('run:event', { type: 'log', payload: { id, line: `> ${task ? task.title : id}: OK` } });
              emit('run:event', { type: 'task', payload: { id, title: task ? task.title : id, index: i + 1, total, status: 'ok', message: `${tt('msg.ok', 'Виконано')} · demo`, freedBytes: 1.2 * 1024 ** 3, undoCount: 1 } });
              i++;
              step();
            }, 900 + Math.random() * 700);
          };
          setTimeout(step, 200);
          return { results: [], freedTotal: 0 };
        }
        case 'run:cancel': return true;
        case 'undo:run': return { ok: true, message: `demo: 0 / ${tt('summary.done', 'OK')}` };
        case 'undo:clear': return true;
        case 'shell:open': return { ok: true };
        default: return { ok: false, message: 'Demo mode: channel unavailable' };
      }
    },
    on: (channel, cb) => {
      listeners[channel] = listeners[channel] || [];
      listeners[channel].push(cb);
      return () => {};
    }
  };
}
