// Pestaña Buscar producto: pinta el flujograma de DropKiller, el semáforo VDO del candidato, el ciclo de vida
// y las fichas de consulta. El formulario y la bitácora están en ui/candidate.js. Recibe datos y callbacks.
(() => {
  const PYL = globalThis.PYL;
  const { el, rich } = PYL.ui.dom;

  const seg = (cls, segments) => { const p = el('p', cls); rich(p, segments); return p; };
  const light = (tone) => el('i', 'light' + (tone ? ' ' + tone : ''));
  const TAG = { g: 'tg', y: 'ty', o: 'to', r: 'tr' };

  // ---------- Flujograma ----------
  // Lista de pasos con sus compuertas de decisión entre ellos.
  function flowList(node, steps, active, done, onSelect) {
    node.textContent = '';
    steps.forEach((s, i) => {
      const li = el('li', 'fl-item' + (done[s.k] ? ' done' : '') + (i === active ? ' on' : ''));
      const b = el('button', 'fl-node');
      b.type = 'button'; b.setAttribute('aria-pressed', String(i === active));
      b.append(el('span', 'fl-n', done[s.k] ? '✓' : String(i + 1)));
      const tx = el('span', 'fl-tx'); tx.append(el('b', null, s.t), el('small', null, s.where));
      b.append(tx);
      b.addEventListener('click', () => onSelect(i));
      li.append(b);
      if (s.gate) {
        const g = el('div', 'fl-gate');
        g.append(el('span', 'fl-dia', '?'), el('span', null, s.gate.q));
        li.append(g);
      }
      node.append(li);
    });
  }

  // Detalle del paso activo.
  function flowStep(node, s, i, total, isDone, on) {
    node.textContent = '';
    const box = el('div', 'fl-detail pop');
    const top = el('div', 'row between');
    top.append(el('span', 'tag tb', `Paso ${i + 1} de ${total}`), el('span', 'small', s.where));
    box.append(top, el('h3', 'mt-s fl-h', s.t), seg('fl-p', s.p));

    if (s.filters) {
      const wrap = el('div', 'chain-help-tbl'), t = el('table'), th = el('thead'), tb = el('tbody');
      const hr = el('tr'); ['Filtro', 'Valor', 'Para qué'].forEach((h) => hr.append(el('th', null, h)));
      th.append(hr);
      s.filters.forEach(([f, v, w]) => {
        const tr = el('tr'); const vv = el('td'); vv.append(el('span', 'num', v));
        tr.append(el('td', null, f), vv, el('td', null, w)); tb.append(tr);
      });
      t.append(th, tb); wrap.append(t); box.append(wrap);
    }
    if (s.list) {
      const ul = el('ul', 'fl-list');
      s.list.forEach((x) => { const li = el('li'); rich(li, x); ul.append(li); });
      box.append(ul);
    }
    if (s.example) { const ex = el('div', 'note nb mt-s'); const sp = el('span'); rich(sp, s.example); ex.append(el('b', null, 'Caso real: '), sp); box.append(ex); }
    if (s.gate) {
      const g = el('div', 'fl-decide mt-s');
      g.append(el('b', null, s.gate.q));
      const r = el('div', 'row mt-s');
      r.append(el('span', 'tag tg', 'Sí → sigo'), el('span', 'tag tr', 'No'), el('span', 'small', s.gate.no));
      g.append(r); box.append(g);
    }

    const acts = el('div', 'row mt');
    const mark = el('button', 'btn sm' + (isDone ? ' ghost' : ''), isDone ? 'Desmarcar' : 'Listo, lo hice');
    mark.type = 'button'; mark.addEventListener('click', on.toggle);
    acts.append(mark);
    if (i < total - 1) {
      const nx = el('button', 'btn ghost sm', 'Siguiente paso →');
      nx.type = 'button'; nx.addEventListener('click', on.next); acts.append(nx);
    } else {
      const cost = el('button', 'btn ghost sm', 'Ir al costeo →');
      cost.type = 'button'; cost.addEventListener('click', on.costeo); acts.append(cost);
    }
    box.append(acts);
    node.append(box);
  }

  function progress(node, done, total, onReset) {
    node.textContent = '';
    const bar = el('div', 'b-bar'), fill = el('i');
    fill.style.width = (total ? (done / total) * 100 : 0) + '%';
    bar.append(fill);
    const t = el('span', 'small', `${done} de ${total} pasos`);
    node.append(bar, t);
    if (done) {
      const r = el('button', 'btn ghost sm', 'Limpiar pasos'); r.type = 'button';
      r.title = 'Desmarca todos los pasos para empezar con otro producto';
      r.addEventListener('click', onReset); node.append(r);
    }
  }

  function result(node, ev) {
    node.textContent = '';
    const v = ev.verdict;
    const head = el('div', 'b-verdict');
    head.append(light(v.tone));
    const tx = el('div'); tx.append(el('b', 'b-vt', v.title), seg('b-vs', v.text));
    head.append(tx);
    node.append(head);
    if (!ev.checks.length) return;
    const ul = el('ul', 'b-checks');
    ev.checks.forEach((c) => {
      const li = el('li'); li.append(light(c.tone), el('b', null, c.label));
      const s = el('span'); rich(s, c.text); li.append(s); ul.append(li);
    });
    node.append(ul);
  }

  // ---------- Ciclo de vida ----------
  function stages(node, list, current, rangeOf) {
    node.textContent = '';
    list.forEach((s) => {
      const on = current && current.k === s.k;
      const c = el('div', 'b-stage st-' + s.k + (on ? ' on' : ''));
      c.append(el('span', 'b-st-r', rangeOf(s) + ' ventas'), el('b', null, s.name), el('span', 'tag ' + TAG[s.tone], s.risk));
      const p = el('p'); rich(p, s.act); c.append(p);
      if (on) c.append(el('span', 'b-here', 'Mi candidato está aquí'));
      node.append(c);
    });
  }

  // ---------- Fichas de consulta ----------
  function vdo(node, items) {
    node.textContent = '';
    items.forEach((x) => {
      const c = el('div', 'b-vdo');
      c.append(el('span', 'b-letter', x.k));
      const tx = el('div'); tx.append(el('b', null, x.t), seg('b-rule', x.rule), el('small', null, 'Evito: ' + x.avoid));
      c.append(tx); node.append(c);
    });
  }

  function pyramid(node, items) {
    node.textContent = '';
    items.forEach((x) => {
      const r = el('div', 'b-pyr p-' + x.k);
      r.style.setProperty('--w', 40 + x.pct * 1.2 + '%');
      const bar = el('div', 'b-pyr-bar'); bar.append(el('b', null, x.pct + '%'), el('span', null, x.t));
      r.append(bar, el('small', null, x.d)); node.append(r);
    });
  }

  function cards(node, items) {
    node.textContent = '';
    items.forEach((x) => {
      const c = el('div', 'card b-tool');
      c.append(el('b', null, x.t));
      const p = el('p'); if (Array.isArray(x.d)) rich(p, x.d); else p.textContent = x.d;
      c.append(p); node.append(c);
    });
  }

  function mistakes(node, items) {
    node.textContent = '';
    const ol = el('ol', 'b-mist');
    items.forEach(([t, d]) => { const li = el('li'); li.append(el('b', null, t + ': '), d); ol.append(li); });
    node.append(ol);
  }

  PYL.ui.search = { flowList, flowStep, progress, result, stages, vdo, pyramid, cards, mistakes };
})();
