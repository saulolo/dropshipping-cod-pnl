// Desarrollo → Meta Ads: mapa de la campaña (1 campaña → 4 conjuntos → 4 anuncios) y herramientas de cada paso.
// Los pasos se pintan con ui.landing (stepList, stepDetail, progress): aquí solo va lo propio de Meta.
// Recibe datos y callbacks. Lo derivado se pinta en nodos [data-o] que `outputs` actualiza sin repintar los campos.
(() => {
  const PYL = globalThis.PYL;
  const { el } = PYL.ui.dom;
  const L = PYL.ui.landing;
  const { button, out, valRow, input, seg } = L;
  const fmt = (v) => PYL.core.format.fmt(v, 'cop');

  // ---------- Mapa de la campaña ----------
  // Solo se dibuja el conjunto 1 con su anuncio: los otros son copias, y el bloque "Duplico" muestra cuáles ya hice.
  // level = nivel del paso abierto ('camp' | 'set' | 'ad' | 'all' | null); copies[n] = ya dupliqué el conjunto n.
  // onPick(level) salta al paso de ese nivel; onCopy(texto, etiqueta) copia el nombre de la campaña.
  function map(node, A, level, copies, onPick, onCopy) {
    node.textContent = '';
    const lit = (lv) => level === 'all' || level === lv;
    const nodeBtn = (lv, cls, kids) => {
      const b = button('ma-node ' + cls + (lit(lv) ? ' on' : ''), null, () => onPick(lv));
      b.append(...kids);
      b.title = 'Ver el paso de este nivel';
      return b;
    };
    const name = out('cname', 'ma-name');
    const camp = el('div', 'ma-camp-w');
    const cp = L.copyFeedback(button('btn ghost sm ld-copy ma-camp-copy', '📋 Copiar'), () => name.textContent, 'Nombre de la campaña', onCopy, '✓ Copiado');
    camp.append(nodeBtn('camp', 'ma-camp', [el('span', 'ma-k', '📁 Campaña'), name, el('small', null, 'Ventas · Subasta · ABO')]), cp);

    const sets = el('div', 'ma-sets');
    const col = el('div', 'ma-col ma-stack');
    col.append(
      nodeBtn('set', 'ma-set', [el('span', 'ma-k', '▦ Conjunto 1'), el('small', null, `${fmt(A.daily)} al día`)]),
      nodeBtn('ad', 'ma-ad', [el('span', 'ma-k', '▭ Anuncio 1'), el('small', null, '🎬 Video 1')]),
    );
    const n = A.sets - 1, made = Object.values(copies).filter(Boolean).length;
    const dup = nodeBtn('all', 'ma-dupbox', [
      el('span', 'ma-k', `⧉ Lo duplico ${n} veces`),
      el('small', null, 'Mismo presupuesto, calendario y textos. Solo cambio el nombre y el video.'),
    ]);
    const chips = el('span', 'ma-chips');
    for (let k = 2; k <= A.sets; k++) {
      const c = el('i', copies[k] ? 'ok' : null, copies[k] ? `✓ ${k}` : String(k));
      c.title = `Conjunto ${k} · anuncio ${k} · video ${k}`;
      chips.append(c);
    }
    dup.append(chips, el('small', 'ma-made', `${made} de ${n} copias hechas`));
    sets.append(col, el('span', 'ma-arrow', '→'), dup);
    const sum = el('div', 'ma-sum');
    [[`${A.sets} × ${fmt(A.daily)}`, `${fmt(A.daily * A.sets)} al día`], ['Al publicar', `${1 + A.sets * 2} elementos`], ['Arranca', 'mañana · ' + A.startHour + ':00 a. m.']]
      .forEach(([k, v]) => { const d = el('div'); d.append(el('small', null, k), el('b', null, v)); sum.append(d); });
    node.append(camp, sets, sum);
  }

  // ---------- Herramientas de los pasos (se suman a las de ui.landing en stepDetail) ----------
  const TOOLS = {
    url: (on, st) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'URL de la product page'));
      w.append(input('url', 'URL del producto', st.url, on, { ph: `https://${PYL.core.ads.ADS.store}/products/magnesium` }));
      const r = el('div', 'ma-url mt-s'), msg = out('urlmsg', 'ma-msg'), v = out('url', 'ma-hide');
      r.append(msg, L.copyBtn(v, 'URL de la product page', on.copy), v);
      w.append(r);
      return w;
    },
    name: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Nombre de la campaña'));
      w.append(seg('p', 'note ny ma-need', ['Pongo el ', { b: 'nombre del producto' }, ' arriba, en "Producto que estoy montando".']));
      w.append(valRow('Nombre de la campaña', 'cname', on.copy, 'día y mes de mañana (cuando arranca) - producto en mayúsculas'));
      return w;
    },
    abo: () => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'CBO vs. ABO'));
      const g = el('div', 'ma-vs');
      [
        ['CBO', 'El presupuesto le acompaña', 'Pongo un presupuesto para toda la campaña y Meta lo reparte: le da más a los anuncios que van mejor.', false],
        ['ABO', 'Presupuesto del conjunto de anuncios', 'Yo decido cuánto recibe cada conjunto, sin importar sus resultados. Así cada video tiene un testeo justo.', true],
      ].forEach(([k, label, txt, mine]) => {
        const c = el('div', 'ma-opt' + (mine ? ' on' : ''));
        const hd = el('div', 'row between'); hd.append(el('b', null, k), el('span', 'tag ' + (mine ? 'tg' : 'tn'), mine ? '✓ La que uso' : 'No la uso'));
        c.append(hd, el('small', null, '"' + label + '"'), el('p', null, txt));
        g.append(c);
      });
      w.append(g);
      return w;
    },
    start: (on) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Presupuesto y calendario'));
      w.append(valRow('Presupuesto diario', 'daily', on.copy, 'por conjunto'), valRow('Fecha de inicio', 'start', on.copy, 'el día siguiente'), valRow('Hora', 'hour', on.copy));
      return w;
    },
    dup: (on, st) => {
      const w = el('div', 'ld-tool');
      w.append(el('h4', null, 'Así queda cada conjunto'));
      const g = el('div', 'ma-dupgrid'), A = PYL.core.ads.ADS;
      for (let n = 1; n <= A.sets; n++) {
        const ok = n === 1 || st.done['dup.s' + n];
        const c = el('div', 'ma-card' + (ok ? ' ok' : ''));
        c.append(el('b', null, ok ? '✓' : String(n)), el('span', null, `Conjunto ${n}`), el('span', null, `Anuncio ${n}`), el('span', null, `🎬 Video ${n}`));
        g.append(c);
      }
      w.append(g);
      return w;
    },
    publish: () => {
      const w = el('div', 'ld-tool');
      const A = PYL.core.ads.ADS, total = 1 + A.sets * 2;
      w.append(el('h4', null, `¿Por qué dice "(${total})"?`));
      const r = el('div', 'ma-count');
      [['1', 'campaña'], [String(A.sets), 'conjuntos'], [String(A.sets), 'anuncios']].forEach(([n, t], i) => {
        if (i) r.append(el('span', 'ma-op', '+'));
        const d = el('div'); d.append(el('b', null, n), el('small', null, t)); r.append(d);
      });
      r.append(el('span', 'ma-op', '='));
      const d = el('div', 'tot'); d.append(el('b', null, String(total)), el('small', null, 'para publicar')); r.append(d);
      w.append(r, seg('p', 'small mt-s', ['Si el número no da ', { b: String(total) }, ', me faltó un conjunto o un anuncio.']));
      return w;
    },
  };

  // Pinta lo derivado (v = core.ads.adsView) en los nodos [data-o] de la guía de Meta.
  function outputs(root, v) {
    const O = {
      cname: [v.name], daily: [fmt(v.daily), v.daily], start: [v.start.label], hour: [v.start.hour],
      url: [v.url, v.url], urlmsg: [v.urlCheck.msg],
    };
    root.querySelectorAll('[data-o]').forEach((n) => {
      const [t, raw] = O[n.dataset.o] || ['']; n.textContent = t;
      if (raw != null) n.dataset.raw = String(raw); else delete n.dataset.raw;
    });
    root.querySelectorAll('.ma-msg').forEach((n) => { n.className = 'ma-msg ' + v.urlCheck.state; });
    root.querySelectorAll('.ma-url .ld-copy').forEach((b) => { b.disabled = v.urlCheck.state !== 'ok'; });
    root.querySelectorAll('.ma-need').forEach((n) => { n.hidden = !!v.product; });
  }

  // Estrategia sin paso a paso todavía (ej. CBO): qué es y volver a la que sí está lista.
  function soon(node, s, ready, onPick) {
    node.textContent = '';
    const w = el('div', 'ma-soon');
    w.append(el('span', 'ma-soon-ic', s.icon), el('span', 'tag tn', 'Pronto'), el('h3', 'st-h mt-s', s.h), el('p', 'muted', s.d));
    w.append(seg('p', 'small', ['Cuando documente sus pasos, quedan aquí con el mismo formato: mapa, casillas y ', { b: 'qué pongo en cada campo' }, '.']));
    if (ready) w.append(button('btn sm mt-s', `Ver el paso a paso ${ready.k.toUpperCase()} →`, () => onPick(ready.k)));
    node.append(w);
  }

  PYL.ui.ads = { map, outputs, soon, TOOLS };
})();
