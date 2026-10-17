'use strict';
/* ==========================================================================
   OptiMax landing page — vanilla JS (no dependencies, fully offline)
   ========================================================================== */

/* Mark the document as "scripted" only when this file actually runs, so that
   the page stays fully readable if the script is blocked or fails to parse. */
document.documentElement.classList.add('js');

/* --------------------------------------------------------------------------
   1. CONFIG
   -------------------------------------------------------------------------- */

/* DOWNLOAD_URL — посилання кнопки «Завантажити».
   Зараз стоїть заглушка '#download' (веде до розділу завантаження на цій же
   сторінці). КОЛИ БУДЕ РЕЛІЗ — замініть на пряме посилання GitHub Releases:
   const DOWNLOAD_URL = 'https://github.com/<org>/<repo>/releases/latest/download/OptiMax.exe';
   (або на сторінку релізів: 'https://github.com/<org>/<repo>/releases/latest'). */
const DOWNLOAD_URL = 'https://github.com/enterpriseimpossible-sudo/optimax/releases/latest/download/OptiMax-1.4.1-win-x64.zip';

/* GITHUB_URL — посилання на репозиторій/релізи. */
const GITHUB_URL = 'https://github.com/enterpriseimpossible-sudo/optimax';

/* Мова за замовчуванням (uk — вміст у HTML, en — словник нижче). */
const DEFAULT_LANG = 'uk';

/* --------------------------------------------------------------------------
   2. i18n — англійський словник.
   Українська версія живе прямо в HTML: на старті ми знімаємо знімок текстів
   і повертаємось до нього при перемиканні назад на «uk».
   -------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    'meta.title': 'OptiMax — free Windows 10/11 optimizer | ER7 Studio',
    'meta.description': 'OptiMax is a desktop optimizer for Windows 10/11: 35 tasks in 5 categories, 4 one-click profiles, full undo of every change, 3 themes and 5 languages. Portable .exe, 100% offline and completely free. Made in ER7 Studio.',

    'a11y.skip': 'Skip to content',
    'a11y.nav': 'Main navigation',
    'a11y.lang': 'Page language',
    'a11y.menu': 'Menu',
    'a11y.heroFacts': 'Key facts',
    'a11y.tabs': 'Task categories',
    'a11y.footerNav': 'Footer',
    'a11y.lightbox': 'Screenshot viewer',
    'a11y.close': 'Close',

    'brand.sub': 'PC OPTIMIZATION SUITE',

    'nav.features': 'Features',
    'nav.categories': 'Categories',
    'nav.gallery': 'Screenshots',
    'nav.themes': 'Themes & languages',
    'nav.free': 'Free',
    'nav.faq': 'FAQ',

    'cta.download': 'Download',
    'cta.downloadFree': 'Download for free',
    'cta.downloadNow': 'Download OptiMax',
    'cta.explore': 'What OptiMax can do',
    'cta.releases': 'Releases page',

    'hero.eyebrow': 'Windows 10/11 · portable .exe · nothing to install',
    'hero.slogan': 'Order, speed and health for your PC — in a single window',
    'hero.lede': 'A desktop optimizer for Windows: 35 tasks in 5 categories, 4 one-click profiles and a full undo for every change. It runs locally, with no telemetry and no accounts.',

    'badge.tasks': 'tasks',
    'badge.themes': 'themes',
    'badge.langs': 'languages',
    'badge.free': 'free',

    'alt.app': 'OptiMax dashboard: CPU, RAM, uptime, disks and drive health, junk analysis and four quick-run profiles.',

    'float.dash.t': 'Live dashboard',
    'float.dash.s': 'CPU · RAM · disks · SMART',
    'float.undo.t': 'Full undo',
    'float.undo.s': 'registry · services · DNS · files',
    'float.offline.t': '100% offline',
    'float.offline.s': 'no telemetry',

    'features.kicker': 'What it does',
    'features.title': 'Everything for optimization — from one window',
    'features.sub': 'No dozens of commands scattered across Registry and Control Panel. Pick tasks or a profile, and OptiMax runs them in order, showing the result of every single item.',

    'feat.dash.t': 'Real-time dashboard',
    'feat.dash.d': 'CPU and RAM load, uptime, free disk space and drive health (SMART). Plus a "how much can be freed" analysis that only reads data — it never changes anything.',
    'feat.dash.l1': 'live metric updates',
    'feat.dash.l2': 'SMART status for every drive',
    'feat.dash.l3': 'junk size estimate before cleaning',

    'feat.profiles.t': 'Four one-click profiles',
    'feat.profiles.d': 'Quick Boost, Deep Clean, Gaming Mode and Full Optimization — the task sets are already curated. Or pick manually: "Select all" and "Safe only".',

    'feat.undo.t': 'Full undo of changes',
    'feat.undo.d': 'Every registry, service, DNS or power-plan change and every moved file is recorded in a journal. One button brings everything back.',

    'feat.order.t': 'Tidy desktop',
    'feat.order.d': 'OptiMax creates folders right on the desktop and in Downloads, then files go in by type and app shortcuts are split: office apps into "Office apps", the rest into "Apps". Windows system icons stay untouched.',

    'feat.risk.t': 'Risk levels and transparency',
    'feat.risk.d': 'Every task carries Safe / Careful / Advanced, an estimated duration and the "admin required" or "restart required" tags. Nothing ever runs blindly.',

    'feat.console.t': 'Console tasks',
    'feat.console.d': 'SFC, DISM, chkdsk and WinSxS cleanup run in a visible PowerShell window — you see every line of output and the final result.',

    'feat.startup.t': 'Startup manager and live log',
    'feat.startup.d': 'A list of programs that launch with Windows (registry and Startup folders) toggled with one click, plus a live log of every action.',

    'feat.eco.t': 'Eco mode',
    'feat.eco.d': 'Fewer animations, shadows and gradients — built for weaker PCs. Turn it on manually or let OptiMax detect a slow machine automatically.',

    'feat.offline.t': '100% offline and zero telemetry',
    'feat.offline.d': 'OptiMax has no accounts, makes no network requests and never sends data about your PC anywhere. Settings and the journal stay locally in your user profile.',
    'feat.offline.l1': 'no sign-up',
    'feat.offline.l2': 'no analytics',
    'feat.offline.l3': 'your data stays on your disk',

    'profiles.kicker': 'Quick run',
    'profiles.title': 'One click — and your PC is tuned',
    'profiles.sub': 'A profile is a ready-made set of tasks. It runs sequentially with progress and a live log, and every change can still be reverted.',
    'prof.quick.t': 'Quick boost',
    'prof.quick.s': 'The safest cleanup + speed',
    'prof.deep.t': 'Deep clean',
    'prof.deep.s': 'All caches and junk',
    'prof.gaming.t': 'Gaming mode',
    'prof.gaming.s': 'Maximum for FPS and ping',
    'prof.full.t': 'Full optimization',
    'prof.full.s': 'Everything safe and careful',
    'prof.tasks': 'tasks',

    'cat.kicker': '35 tasks in 5 categories',
    'cat.title': 'Task catalog',
    'cat.sub': 'Every item has a description, a risk level and clear tags — choose manually or rely on a profile. Here is the complete list.',
    'cat.cleanup': 'Cleanup',
    'cat.order': 'Order',
    'cat.perf': 'Performance',
    'cat.network': 'Network',
    'cat.system': 'System',

    'cat.cleanup.note': 'Junk, caches and temporary files. Locked files are skipped — nothing gets broken.',
    'cat.order.note': 'Folders are created right on the desktop and in Downloads. System icons stay untouched, and every moved file can be restored.',
    'cat.perf.note': 'Power plans, services and Windows tweaks. Most changes are reversible — the "Undo" button restores previous values.',
    'cat.network.note': 'DNS, TCP and gaming network settings. Before any change OptiMax remembers the current adapter settings.',
    'cat.system.note': 'Maintenance, integrity checks and diagnostics. Before serious changes OptiMax offers to create a restore point.',

    't.clean_temp_user': 'User temporary files',
    't.clean_temp_user.d': 'The %TEMP% folder: installer leftovers, app caches, temporary data.',
    't.clean_temp_windows': 'Windows temporary files',
    't.clean_temp_windows.d': 'C:\\Windows\\Temp. Requires administrator rights.',
    't.clean_recycle': 'Recycle Bin',
    't.clean_recycle.d': 'Permanently deletes the contents of the Recycle Bin on all drives and reports how much space was freed.',
    't.clean_browser': 'Browser cache (Edge, Chrome)',
    't.clean_browser.d': 'Cache, Code Cache and GPU Cache. Cookies, passwords and history are not touched.',
    't.clean_thumbnails': 'Explorer thumbnail cache',
    't.clean_thumbnails.d': 'Stale image thumbnails; locked files disappear after a reboot.',
    't.clean_crashdumps': 'Crash dumps and error reports',
    't.clean_crashdumps.d': 'CrashDumps, Minidump and WER reports (ReportQueue / ReportArchive).',
    't.clean_updates': 'Windows Update cache',
    't.clean_updates.d': 'Downloaded update packages; Windows re-downloads them only when needed.',
    't.clean_prefetch': 'Prefetch',
    't.clean_prefetch.d': 'C:\\Windows\\Prefetch — the cache is rebuilt on the next app launches.',
    't.clean_winold': 'Windows.old (previous install)',
    't.clean_winold.d': 'Often tens of gigabytes. Irreversible: rolling back to the older Windows version becomes impossible.',
    't.clean_winsxs': 'WinSxS cleanup (DISM)',
    't.clean_winsxs.d': 'DISM /StartComponentCleanup — removes superseded update components in a console window.',

    't.order_desktop': 'Tidy the desktop',
    't.order_desktop.d': 'Creates folders right on the desktop and sorts app shortcuts (office apps separately) and files by type: images, documents, video. System icons stay where they are.',
    't.order_downloads': 'Tidy Downloads',
    't.order_downloads.d': 'Sorts files into folders inside Downloads; fresh files (under 24 hours) are left alone.',
    't.order_names': 'Clean file names',
    't.order_names.d': 'Removes double and stray spaces in names on the desktop, in Downloads and Documents. Names are never shortened — only aligned.',
    't.order_photos': 'Photos and videos by year',
    't.order_photos.d': 'Moves images and videos from the root of Pictures into subfolders by year (based on the file modified date).',

    't.perf_power_ultimate': 'Ultimate Performance power plan',
    't.perf_power_ultimate.d': 'Enables the Ultimate Performance plan with no CPU frequency or device latency limits; the previous plan is remembered.',
    't.perf_visualfx': 'Visual effects → performance',
    't.perf_visualfx.d': 'Switches Windows to "Adjust for best performance". Restored with one click.',
    't.perf_telemetry_off': 'Windows telemetry',
    't.perf_telemetry_off.d': 'Disables the DiagTrack service, the AllowTelemetry policy and data collection tasks.',
    't.perf_bg_apps_off': 'UWP background apps',
    't.perf_bg_apps_off.d': 'Store apps stop running in the background. Reverted through undo.',
    't.perf_menu_delay': 'Menu delay and animations',
    't.perf_menu_delay.d': 'Removes the artificial menu open delay (400 ms) — the interface reacts instantly.',
    't.perf_hibernate_off': 'Turn off hibernation',
    't.perf_hibernate_off.d': 'Frees hiberfil.sys on disk — as large as your RAM.',
    't.perf_sysmain': 'SysMain (SuperFetch) service',
    't.perf_sysmain.d': 'Disables app preloading. Useful on SSDs; on HDDs it may hurt performance.',
    't.perf_game_tweaks': 'Gaming tweaks (Game Mode + Game DVR off)',
    't.perf_game_tweaks.d': 'Enables Game Mode and disables background Game DVR recording — fewer stutters in games.',
    't.perf_gpu_sched': 'Hardware GPU scheduling (HAGS)',
    't.perf_gpu_sched.d': 'Sets HwSchMode=2 — lower frame latency on supported GPUs. Requires a restart.',
    't.perf_search_off': 'Disable search indexing',
    't.perf_search_off.d': 'Stops the WSearch service. Start-menu search still works, file and Outlook search does not.',

    't.net_dns_flush': 'Flush DNS cache',
    't.net_dns_flush.d': 'Resets the DNS and NetBIOS cache — helps with website access errors.',
    't.net_tcp_tune': 'TCP optimization',
    't.net_tcp_tune.d': 'Restores autotuning=normal, enables RSS, disables heuristics.',
    't.net_dns_fast': 'Fast DNS (Cloudflare 1.1.1.1)',
    't.net_dns_fast.d': 'Sets 1.1.1.1 / 1.0.0.1 on the active adapter; previous values are saved.',
    't.net_dns_reset': 'Reset DNS to automatic',
    't.net_dns_reset.d': 'Returns DNS servers to router / DHCP on all adapters.',
    't.net_nagle_off': 'Disable Nagle algorithm',
    't.net_nagle_off.d': 'TCPNoDelay=1 and TcpAckFrequency=1 — lower ping in online games.',
    't.net_winsock_reset': 'Reset the Winsock stack',
    't.net_winsock_reset.d': 'netsh winsock reset — repairs broken networking after VPNs and antiviruses. Requires a restart.',

    't.sys_restore_point': 'Create a restore point',
    't.sys_restore_point.d': 'Checkpoint-Computer tagged OptiMax — the system can then be rolled back with built-in Windows tools.',
    't.sys_sfc': 'System file integrity check (SFC)',
    't.sys_sfc.d': 'sfc /scannow in a console window — finds and repairs corrupted system files.',
    't.sys_dism': 'Repair the system image (DISM)',
    't.sys_dism.d': 'DISM /Online /Cleanup-Image /RestoreHealth — repairs the Windows component store.',
    't.sys_chkdsk': 'Check drive C: (online scan)',
    't.sys_chkdsk.d': 'chkdsk C: /scan — a quick file-system check with no reboot.',
    't.sys_update_open': 'Open Windows Update',
    't.sys_update_open.d': 'Jumps straight to ms-settings:windowsupdate to check for updates manually.',

    'risk.safe': 'Safe',
    'risk.medium': 'Careful',
    'risk.advanced': 'Advanced',

    'gal.kicker': 'Screenshots',
    'gal.title': 'The real interface, no mockups',
    'gal.sub': 'Every image is an actual application window. Click one to view it larger.',
    'gal.1.t': 'Dashboard',
    'gal.1.c': 'CPU, RAM, disks, SMART and profiles',
    'gal.2.t': 'Category "Order"',
    'gal.2.c': 'Folders, files and shortcuts tidied up',
    'gal.3.t': 'Settings',
    'gal.3.c': 'Language, theme, eco mode',
    'gal.4.t': 'Running tasks',
    'gal.4.c': 'Progress and a live log',
    'gal.5.t': 'Result',
    'gal.5.c': 'A report for every item',
    'gal.6.t': 'English UI',
    'gal.6.c': '5 interface languages',
    'gal.7.t': 'Gray theme',
    'gal.7.c': 'The "Gray" theme',
    'gal.8.t': 'Black theme',
    'gal.8.c': 'The "Black" theme',
    'gal.9.t': 'About',
    'gal.9.c': 'Version 1.4.1 · ER7 Studio',

    'theme.kicker': 'Appearance',
    'theme.title': '3 themes and 5 languages — your way',
    'theme.sub': 'Theme and language persist between launches. Eco mode strips animations and gradients on slower machines.',
    'theme.light.t': 'Light (default)',
    'theme.light.d': 'The default application theme — a bright interface.',
    'theme.gray.t': 'Gray',
    'theme.gray.d': 'A muted option for long sessions.',
    'theme.black.t': 'Black',
    'theme.black.d': 'The darkest interface available.',

    'langs.title': '5 interface languages',
    'langs.sub': 'Ukrainian, English, Polish, German, Russian — switch in Settings, the choice is remembered.',
    'lang.uk': 'Ukrainian',
    'lang.en': 'English',
    'lang.pl': 'Polish',
    'lang.de': 'German',
    'lang.ru': 'Russian',

    'free.kicker': 'A gift, not a subscription product',
    'free.title': 'Free for everyone',
    'free.lede': 'OptiMax is a completely free application. No activation keys, no trials, no subscriptions and no ads. That was the plan from day one.',
    'free.studio': 'Made in ER7 Studio',
    'free.i1.t': 'No payments',
    'free.i1.d': 'No keys, trials or subscriptions — all 35 tasks are available right away.',
    'free.i2.t': 'MIT license',
    'free.i2.d': 'Open source: read, modify and use it freely.',
    'free.i3.t': 'Private by default',
    'free.i3.d': 'No telemetry, no accounts, no network requests — everything works offline.',
    'free.i4.t': 'Built for people',
    'free.i4.d': 'The goal is to make Windows optimization understandable and safe for everyone.',

    'dl.kicker': 'Download',
    'dl.title': 'Get OptiMax from GitHub Releases',
    'dl.sub': 'A portable .exe — no installer and nothing written into the system. Unpack it anywhere (a USB stick works) and run it.',
    'dl.s1.t': 'Download the .exe',
    'dl.s1.d': 'The button below opens the project releases page.',
    'dl.s2.t': 'Run as administrator',
    'dl.s2.d': 'Administrator rights are required by some tasks — system temp folders, services and network tweaks.',
    'dl.s3.t': 'Pick a profile',
    'dl.s3.d': 'One click and OptiMax reports on every task. Changes can always be reverted.',
    'dl.req': 'Requirements: Windows 10 or 11 (x64). The app runs locally and needs no internet connection.',
    'dl.spec.t': 'Technical details',
    'dl.spec.sys': 'OS',
    'dl.spec.dist': 'Format',
    'dl.spec.dist.v': 'Portable .exe, no installer',
    'dl.spec.tech': 'Built with',
    'dl.spec.ver': 'Version',
    'dl.spec.lic': 'License',
    'dl.spec.lic.v': 'MIT (code) · EULA',
    'dl.spec.net': 'Internet',
    'dl.spec.net.v': 'Not required',
    'dl.safe': 'Create a restore point before serious changes — OptiMax offers it as a separate task.',

    'faq.kicker': 'FAQ',
    'faq.title': 'Frequently asked questions',
    'faq.q1': 'Is OptiMax really free?',
    'faq.a1': 'Yes, completely and with no conditions. It is a gift from ER7 Studio: no activation keys, no trials, no subscriptions and no ads. All 35 tasks are available the moment you launch it.',
    'faq.q2': 'Do I need an installer or administrator rights?',
    'faq.a2': 'No installer: OptiMax is a portable .exe you can keep anywhere. Some tasks (system folders, services, network settings) require administrator rights — the app marks this for every item and offers to restart with elevated privileges.',
    'faq.q3': 'What exactly does the "Order" category do?',
    'faq.a3': 'OptiMax creates folders right on the desktop and in Downloads, then sorts files in by type and app shortcuts separately: office apps go to "Office apps", the rest to "Apps". File names are aligned without being shortened, and photos and videos are grouped by year. Desktop system icons are never touched, and every move can be undone.',
    'faq.q4': 'Can changes be undone?',
    'faq.a4': 'Yes. All reversible changes — registry, services, power plans, DNS settings and moved files — are recorded in the "History & undo" journal. One button restores the previous state. A restore point as a separate task adds another layer of safety for system checks.',
    'faq.q5': 'Does it need internet, and does OptiMax collect data?',
    'faq.a5': 'No. OptiMax works 100% offline: no telemetry, no accounts, no network requests. Settings and the journal are stored locally in your user profile. A separate "Windows telemetry" task disables the system\u2019s own data collection.',
    'faq.q6': 'How safe are these changes to run?',
    'faq.a6': 'Every task has a description, a risk level (Safe / Careful / Advanced) and tags such as "admin required" or "restart required". You can run only safe tasks or a ready-made profile. Risky items are never enabled silently — they are your choice alone.',

    'final.title': 'Make your PC faster — today and for free',
    'final.sub': '35 tasks, 4 profiles, full undo. Grab the portable .exe and run it as administrator.',

    'footer.tagline': 'A free Windows 10/11 optimizer. Local, offline, no telemetry.',
    'footer.col1': 'Product',
    'footer.col2': 'Project',
    'footer.download': 'Download',
    'footer.github': 'GitHub (placeholder)',
    'footer.license': 'MIT license',
    'footer.made': 'Made in ER7 Studio · free for everyone'
  }
};

/* --------------------------------------------------------------------------
   3. Small helpers
   -------------------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   4. Download / GitHub links from config
   -------------------------------------------------------------------------- */
$$('[data-download-link]').forEach((a) => {
  a.setAttribute('href', DOWNLOAD_URL);
  if (/^https?:/i.test(DOWNLOAD_URL)) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
});
$$('[data-github-link]').forEach((a) => a.setAttribute('href', GITHUB_URL));

/* --------------------------------------------------------------------------
   5. Language switch (uk text lives in HTML, en comes from STRINGS)
   -------------------------------------------------------------------------- */
const i18nNodes = $$('[data-i18n]');
const ariaNodes = $$('[data-i18n-aria]');
const altNodes = $$('[data-i18n-alt]');

/* Snapshot of the original (Ukrainian) content + attributes. */
const original = new Map();
i18nNodes.forEach((el) => original.set(el, el.innerHTML));
const originalAria = new Map();
ariaNodes.forEach((el) => originalAria.set(el, el.getAttribute('aria-label') || ''));
const originalAlt = new Map();
altNodes.forEach((el) => originalAlt.set(el, el.getAttribute('alt') || ''));

const originalMeta = {
  title: document.title,
  description: ($('meta[name="description"]') || {}).content || ''
};

function applyLanguage(lang) {
  const dict = STRINGS[lang];

  i18nNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = dict && dict[key];
    if (value !== undefined) el.innerHTML = value;
    else el.innerHTML = original.get(el);
  });
  ariaNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const value = dict && dict[key];
    el.setAttribute('aria-label', value !== undefined ? value : originalAria.get(el));
  });
  altNodes.forEach((el) => {
    const key = el.getAttribute('data-i18n-alt');
    const value = dict && dict[key];
    el.setAttribute('alt', value !== undefined ? value : originalAlt.get(el));
  });

  if (dict) {
    if (dict['meta.title']) document.title = dict['meta.title'];
    const desc = $('meta[name="description"]');
    if (desc && dict['meta.description']) desc.setAttribute('content', dict['meta.description']);
  } else {
    document.title = originalMeta.title;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', originalMeta.description);
  }

  document.documentElement.lang = lang;
  $$('.lang-btn').forEach((btn) => {
    const active = btn.getAttribute('data-lang') === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  try { localStorage.setItem('optimax-lang', lang); } catch (e) { /* storage may be blocked */ }
}

$$('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-lang')));
});

let storedLang = DEFAULT_LANG;
try { storedLang = localStorage.getItem('optimax-lang') || DEFAULT_LANG; } catch (e) { /* ignore */ }
applyLanguage(storedLang === 'en' ? 'en' : 'uk');

/* --------------------------------------------------------------------------
   6. Sticky header state
   The 1px sentinel + IntersectionObserver is the primary (deterministic)
   signal; the scroll listener stays as a harmless secondary trigger.
   -------------------------------------------------------------------------- */
const header = $('.site-header');
const sentinel = document.createElement('div');
sentinel.className = 'top-sentinel';
sentinel.setAttribute('aria-hidden', 'true');
document.body.prepend(sentinel);

function updateHeaderState() {
  const stuck = sentinel.getBoundingClientRect().bottom < 1 || window.scrollY > 8;
  header.classList.toggle('is-stuck', stuck);
}
updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(updateHeaderState, { threshold: [0, 1] }).observe(sentinel);
}

/* --------------------------------------------------------------------------
   7. Mobile navigation
   -------------------------------------------------------------------------- */
const menuToggle = $('#menu-toggle');
const mainNav = $('#main-nav');

function setNav(open) {
  header.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}
menuToggle.addEventListener('click', () => setNav(!header.classList.contains('nav-open')));
$$('#main-nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header.classList.contains('nav-open')) {
    setNav(false);
    menuToggle.focus();
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 1020) setNav(false);
});

/* --------------------------------------------------------------------------
   8. Reveal on scroll
   -------------------------------------------------------------------------- */
const revealNodes = $$('.reveal');
function showAllReveals() {
  revealNodes.forEach((el) => el.classList.add('is-visible'));
}
if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  showAllReveals();
} else {
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = Array.from(el.parentElement ? el.parentElement.children : []);
      const index = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = Math.min(index * 70, 350) + 'ms';
      el.classList.add('is-visible');
      obs.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealNodes.forEach((el) => revealObserver.observe(el));
  /* Safety net: never leave content hidden if the observer misbehaves. */
  window.setTimeout(showAllReveals, 3000);
}

/* Active section highlighting in the header nav — computed from layout, so it
   works even where scroll events are not delivered. */
const navLinks = $$('#main-nav a[href^="#"]');
const watchedSections = $$('main > section[id]');
function syncNavHighlight() {
  const anchorY = window.innerHeight * 0.35;
  let current = null;
  watchedSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= anchorY) current = section;
  });
  const id = current ? current.id : null;
  navLinks.forEach((a) => {
    if (id && a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}
if ('IntersectionObserver' in window && watchedSections.length) {
  const navObserver = new IntersectionObserver(() => syncNavHighlight(), {
    rootMargin: '-40% 0px -55% 0px',
    threshold: [0, 0.5, 1]
  });
  watchedSections.forEach((s) => navObserver.observe(s));
  window.addEventListener('scroll', syncNavHighlight, { passive: true });
  window.addEventListener('resize', syncNavHighlight);
  syncNavHighlight();
}

/* --------------------------------------------------------------------------
   9. Category tabs (roving tabindex + arrow keys)
   -------------------------------------------------------------------------- */
const tabs = $$('.tab');
const panels = $$('.panel');

function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
  });
  panels.forEach((p) => {
    const active = p.id === tab.getAttribute('aria-controls');
    p.classList.toggle('is-active', active);
    p.hidden = !active;
  });
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in keys) {
      e.preventDefault();
      const next = tabs[(i + keys[e.key] + tabs.length) % tabs.length];
      selectTab(next, true);
    } else if (e.key === 'Home') {
      e.preventDefault(); selectTab(tabs[0], true);
    } else if (e.key === 'End') {
      e.preventDefault(); selectTab(tabs[tabs.length - 1], true);
    }
  });
});

/* --------------------------------------------------------------------------
   10. Screenshot lightbox
   -------------------------------------------------------------------------- */
const lightbox = $('#lightbox');
const lightboxImg = $('#lightbox-img');
const lightboxCaption = $('#lightbox-caption');
const lightboxClose = $('.lightbox-close');
let lastFocused = null;

function openLightbox(src, caption, trigger) {
  lastFocused = trigger || document.activeElement;
  lightboxImg.setAttribute('src', src);
  lightboxImg.setAttribute('alt', caption || '');
  lightboxCaption.textContent = caption || '';
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lightboxClose.focus();
}
function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

$$('.shot-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const figCaption = btn.parentElement.querySelector('figcaption');
    const caption = figCaption ? figCaption.textContent.trim().replace(/\s+/g, ' ') : '';
    openLightbox(btn.getAttribute('data-full'), caption, btn);
  });
});
$$('[data-close]').forEach((el) => el.addEventListener('click', closeLightbox));
document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'Tab') {
    e.preventDefault();
    lightboxClose.focus();
  }
});

/* --------------------------------------------------------------------------
   11. FAQ — keep one item open at a time
   -------------------------------------------------------------------------- */
const faqItems = $$('.faq-item');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    faqItems.forEach((other) => { if (other !== item) other.open = false; });
  });
});
