'use strict';
/**
 * preload.js — безпечний місток renderer ↔ main (contextIsolation).
 */
const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = new Set([
  'app:info', 'app:relaunch-admin',
  'i18n:get',
  'tasks:get',
  'run:start', 'run:cancel',
  'settings:get', 'settings:set', 'settings:reset',
  'stats:live',
  'analyze:run',
  'history:get', 'undo:run', 'undo:clear',
  'logs:clear', 'data:open-folder',
  'startup:list', 'startup:toggle',
  'shell:open'
]);

const PUSH_CHANNELS = new Set(['stats:tick', 'run:event']);

contextBridge.exposeInMainWorld('optima', {
  invoke: (channel, ...args) => {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`Заблокований канал: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, callback) => {
    if (!PUSH_CHANNELS.has(channel)) return () => {};
    const listener = (_e, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
