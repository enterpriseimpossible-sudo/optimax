'use strict';
/* UI · віджети
   Модальне вікно та тости.
   (частина колишнього app.js; порядок завантаження задає index.html) */
// ---------------- modal ----------------
let modalFootButtons = [];

function bindModal() {
  $('#modalClose').onclick = () => closeModal();
  $('#modalBackdrop').addEventListener('click', (e) => {
    if (e.target === $('#modalBackdrop')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(title, bodyHtml, buttons) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  const foot = $('#modalFoot');
  foot.innerHTML = '';
  modalFootButtons = buttons || [];
  modalFootButtons.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = `btn ${b.cls || 'ghost'}`;
    btn.innerHTML = `${b.icon ? `<svg><use href="#${b.icon}"/></svg>` : ''}${esc(b.label)}`;
    btn.onclick = () => { if (b.action === 'close') closeModal(); else if (typeof b.action === 'function') b.action(); else closeModal(); };
    foot.appendChild(btn);
  });
  $('#modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  state.run.logOpen = false;
  $('#modalBackdrop').classList.add('hidden');
  $('#modalBody').innerHTML = '';
}

// ---------------- toasts ----------------
function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3400);
  setTimeout(() => el.remove(), 3800);
}
