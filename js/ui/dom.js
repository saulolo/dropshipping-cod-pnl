// Utilidades DOM compartidas por todos los componentes de UI.
(() => {
  const ui = (globalThis.PYL.ui ??= {});

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // Texto con negritas a partir de segmentos: string plano o { b: 'texto en negrita' }.
  const rich = (node, segments) => {
    node.textContent = '';
    segments.forEach((s) => node.append(typeof s === 'string' ? s : el('b', null, s.b)));
  };

  // Indicador de estado (punto + texto) de las tarjetas KPI. Sin texto queda oculto.
  function chip(id, cls, text) { const c = $(id); c.className = 'chip ' + (cls || ''); c.textContent = text || ''; }

  // Marca el botón activo de un grupo segmentado (.seg).
  function setPressed(group, selector, active) {
    group.querySelectorAll(selector).forEach((x) => { const on = x === active; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }

  ui.dom = { $, el, rich, chip, setPressed };
})();
