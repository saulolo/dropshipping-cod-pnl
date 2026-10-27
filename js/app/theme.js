// Tema claro/oscuro: <html data-theme>. Se carga en <head> para aplicarlo antes de pintar
// y se recuerda en este navegador. Por defecto, oscuro.
(() => {
  const app = ((globalThis.PYL ??= {}).app ??= {});
  const KEY = 'pyl-theme';
  const root = document.documentElement;

  function apply(theme) {
    root.dataset.theme = theme;
    const sw = document.getElementById('theme-switch');
    if (!sw) return;
    const light = theme === 'light';
    sw.setAttribute('aria-checked', String(light));
    sw.title = light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  }

  function set(theme) {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* sin almacenamiento */ }
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
  apply(saved === 'light' ? 'light' : 'dark');

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.getElementById('theme-switch').addEventListener('click', () => set(root.dataset.theme === 'light' ? 'dark' : 'light'));
  });

  app.theme = { set, get: () => root.dataset.theme };
})();
