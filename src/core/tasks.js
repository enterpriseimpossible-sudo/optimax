'use strict';
/**
 * tasks.js — каталог задач OptiMax (лише структура та логіка).
 * Усі тексти локалізуються: task.<id>.t / task.<id>.d, nav.<category>, view.<category>.sub,
 * profile.<id> / profile.<id>.sub — у core/locales/<мова>.json.
 *
 * risk:       safe | medium | advanced
 * reversible: чи можна повернути зміни через undo-журнал
 * console:    true → запускається у видимому вікні PowerShell (чекає закриття)
 * profiles:   до яких швидких профілів входить задача
 */

const CATEGORIES = [
  { id: 'cleanup', icon: 'broom' },
  { id: 'order', icon: 'order' },
  { id: 'perf', icon: 'gauge' },
  { id: 'network', icon: 'wifi' },
  { id: 'system', icon: 'shield' }
];

const TASKS = [
  // ---------------- ОЧИЩЕННЯ ----------------
  {
    id: 'clean_temp_user', category: 'cleanup',
    risk: 'safe', admin: false, reversible: false, estMinutes: 1.5,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/temp-user.ps1'
  },
  {
    id: 'clean_temp_windows', category: 'cleanup',
    risk: 'safe', admin: true, reversible: false, estMinutes: 1,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/temp-windows.ps1'
  },
  {
    id: 'clean_recycle', category: 'cleanup',
    risk: 'safe', admin: false, reversible: false, estMinutes: 0.5,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/recycle.ps1'
  },
  {
    id: 'clean_browser', category: 'cleanup',
    risk: 'safe', admin: false, reversible: false, estMinutes: 1.5,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/browser-cache.ps1'
  },
  {
    id: 'clean_thumbnails', category: 'cleanup',
    risk: 'safe', admin: false, reversible: false, estMinutes: 0.5,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/thumbnails.ps1'
  },
  {
    id: 'clean_crashdumps', category: 'cleanup',
    risk: 'safe', admin: true, reversible: false, estMinutes: 0.5,
    default: true, profiles: ['quick', 'deep', 'full'], script: 'cleanup/crashdumps.ps1'
  },
  {
    id: 'clean_updates', category: 'cleanup',
    risk: 'medium', admin: true, reversible: false, estMinutes: 3,
    default: false, profiles: ['deep', 'full'], script: 'cleanup/update-cache.ps1'
  },
  {
    id: 'clean_prefetch', category: 'cleanup',
    risk: 'medium', admin: true, reversible: false, estMinutes: 0.5,
    default: false, profiles: ['deep', 'full'], script: 'cleanup/prefetch.ps1'
  },
  {
    id: 'clean_winold', category: 'cleanup',
    risk: 'medium', admin: true, reversible: false, estMinutes: 15,
    default: false, profiles: [], script: 'cleanup/winold.ps1', timeoutMs: 1800000
  },
  {
    id: 'clean_winsxs', category: 'cleanup',
    risk: 'medium', admin: true, reversible: false, estMinutes: 20,
    default: false, profiles: [], script: 'cleanup/winsxs.ps1', console: true
  },

  // ---------------- ПОРЯДОК ----------------
  {
    id: 'order_desktop', category: 'order',
    risk: 'medium', admin: false, reversible: true, estMinutes: 1,
    default: false, profiles: [], script: 'order/tidy-desktop.ps1'
  },
  {
    id: 'order_downloads', category: 'order',
    risk: 'medium', admin: false, reversible: true, estMinutes: 1.5,
    default: false, profiles: [], script: 'order/tidy-downloads.ps1'
  },
  {
    id: 'order_names', category: 'order',
    risk: 'medium', admin: false, reversible: true, estMinutes: 2,
    default: false, profiles: [], script: 'order/tidy-names.ps1'
  },
  {
    id: 'order_photos', category: 'order',
    risk: 'medium', admin: false, reversible: true, estMinutes: 1.5,
    default: false, profiles: [], script: 'order/tidy-photos.ps1'
  },

  // ---------------- ПРОДУКТИВНІСТЬ ----------------
  {
    id: 'perf_power_ultimate', category: 'perf',
    risk: 'safe', admin: true, reversible: true, estMinutes: 0.2,
    default: true, profiles: ['quick', 'gaming', 'full'], script: 'perf/power-ultimate.ps1'
  },
  {
    id: 'perf_visualfx', category: 'perf',
    risk: 'safe', admin: false, reversible: true, estMinutes: 0.2,
    default: false, profiles: ['gaming', 'full'], script: 'perf/visualfx.ps1'
  },
  {
    id: 'perf_telemetry_off', category: 'perf',
    risk: 'medium', admin: true, reversible: true, estMinutes: 0.5,
    default: true, profiles: ['gaming', 'full'], script: 'perf/telemetry-off.ps1'
  },
  {
    id: 'perf_bg_apps_off', category: 'perf',
    risk: 'medium', admin: true, reversible: true, estMinutes: 0.3,
    default: false, profiles: ['gaming', 'full'], script: 'perf/bg-apps-off.ps1'
  },
  {
    id: 'perf_menu_delay', category: 'perf',
    risk: 'safe', admin: false, reversible: true, estMinutes: 0.2,
    default: false, profiles: ['full'], script: 'perf/menu-delay.ps1'
  },
  {
    id: 'perf_hibernate_off', category: 'perf',
    risk: 'medium', admin: true, reversible: true, estMinutes: 0.3,
    default: false, profiles: ['full'], script: 'perf/hibernate-off.ps1'
  },
  {
    id: 'perf_sysmain', category: 'perf',
    risk: 'advanced', admin: true, reversible: true, estMinutes: 0.3,
    default: false, profiles: [], script: 'perf/sysmain.ps1'
  },
  {
    id: 'perf_game_tweaks', category: 'perf',
    risk: 'safe', admin: false, reversible: true, estMinutes: 0.2,
    default: false, profiles: ['gaming'], script: 'perf/game-tweaks.ps1'
  },
  {
    id: 'perf_gpu_sched', category: 'perf',
    risk: 'advanced', admin: true, reversible: true, estMinutes: 0.2,
    default: false, profiles: [], script: 'perf/gpu-sched.ps1', reboot: true
  },
  {
    id: 'perf_search_off', category: 'perf',
    risk: 'advanced', admin: true, reversible: true, estMinutes: 0.3,
    default: false, profiles: [], script: 'perf/search-off.ps1'
  },

  // ---------------- МЕРЕЖА ----------------
  {
    id: 'net_dns_flush', category: 'network',
    risk: 'safe', admin: false, reversible: false, estMinutes: 0.1,
    default: true, profiles: ['quick', 'deep', 'gaming', 'full'], script: 'network/dns-flush.ps1'
  },
  {
    id: 'net_tcp_tune', category: 'network',
    risk: 'medium', admin: true, reversible: true, estMinutes: 0.2,
    default: false, profiles: ['gaming', 'full'], script: 'network/tcp-tune.ps1'
  },
  {
    id: 'net_dns_fast', category: 'network',
    risk: 'medium', admin: true, reversible: true, estMinutes: 0.2,
    default: false, profiles: [], script: 'network/dns-fast.ps1'
  },
  {
    id: 'net_dns_reset', category: 'network',
    risk: 'safe', admin: true, reversible: true, estMinutes: 0.2,
    default: false, profiles: [], script: 'network/dns-reset.ps1'
  },
  {
    id: 'net_nagle_off', category: 'network',
    risk: 'advanced', admin: true, reversible: true, estMinutes: 0.2,
    default: false, profiles: [], script: 'network/nagle-off.ps1'
  },
  {
    id: 'net_winsock_reset', category: 'network',
    risk: 'advanced', admin: true, reversible: false, estMinutes: 0.2,
    default: false, profiles: [], script: 'network/winsock-reset.ps1', reboot: true
  },

  // ---------------- СИСТЕМА ----------------
  {
    id: 'sys_restore_point', category: 'system',
    risk: 'safe', admin: true, reversible: false, estMinutes: 1,
    default: true, profiles: ['quick', 'deep', 'gaming', 'full'], script: 'system/restore-point.ps1', timeoutMs: 300000
  },
  {
    id: 'sys_sfc', category: 'system',
    risk: 'advanced', admin: true, reversible: false, estMinutes: 12,
    default: false, profiles: [], script: 'system/sfc.ps1', console: true
  },
  {
    id: 'sys_dism', category: 'system',
    risk: 'advanced', admin: true, reversible: false, estMinutes: 25,
    default: false, profiles: [], script: 'system/dism.ps1', console: true
  },
  {
    id: 'sys_chkdsk', category: 'system',
    risk: 'medium', admin: true, reversible: false, estMinutes: 5,
    default: false, profiles: [], script: 'system/chkdsk.ps1', console: true
  },
  {
    id: 'sys_update_open', category: 'system',
    risk: 'safe', admin: false, reversible: false, estMinutes: 0.1,
    default: false, profiles: [], uri: 'ms-settings:windowsupdate'
  }
];

const PROFILES = [
  { id: 'quick', icon: 'bolt' },
  { id: 'deep', icon: 'broom' },
  { id: 'gaming', icon: 'gamepad' },
  { id: 'full', icon: 'rocket' }
];

function getTask(id) {
  return TASKS.find((t) => t.id === id) || null;
}

module.exports = { CATEGORIES, TASKS, PROFILES, getTask };
