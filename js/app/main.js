// Orquestador: calcula el P&L del filtro actual y pide a cada componente que se pinte.
// Último script en cargar: aquí se conectan los eventos y arranca la app.
(() => {
  const PYL = globalThis.PYL;
  const { core, ui, app } = PYL;
  const S = app.state;
  const { $, setPressed } = ui.dom;
  const { aggregate, products } = core.pnl;

  function render() {
    if (!S.dropi) { ui.notices.render(null, S); $('#dash').classList.add('hidden'); return; }
    $('#dash').classList.remove('hidden');
    const f = app.filters.read();
    const mx = app.dataLoader.metricsContext();
    const a = aggregate(S.dropi.lines, S.meta || [], f, mx);
    const x = app.filters.extras(f, a);
    S.current = { a, x, f };

    ui.notices.render(a, S);
    app.filters.showAutoValues(a);
    ui.summary.renderHeader(a, x);
    ui.summary.renderKpis(a);
    ui.cascade.draw(a);
    ui.diagnosisPanel.render('#cdiag-table', '#cdiag-concl', core.diagnostics.cascade(a));
    ui.funnel.draw(a, S.funnelMode === 'pct');
    ui.diagnosisPanel.render('#diag-table', '#diag-concl', core.diagnostics.funnel(a, x.producto));
    ui.unitTable.draw(a);
    ui.productsTable.draw({
      rows: productRows(f, mx),
      selected: S.prod,
      hasBilling: !!S.meta,
      onSelect: (key) => app.filters.selectProduct(key),
    });
    ui.campaignsTable.draw({
      rows: campaignRows(f),
      products: products(S.dropi.lines),
      onAssign: app.dataLoader.assignCampaign,
    });
    ui.presets.draw(app.filters.presetList(), f, (p) => app.filters.selectProduct(p.prod, p.from, p.to));
  }

  // Una fila por producto más el consolidado, siempre con la inversión automática.
  function productRows(f, mx) {
    const rows = products(S.dropi.lines).map((p) => [p, p]);
    rows.push(['Todos / Consolidado', '__all']);
    return rows.map(([label, key]) => ({ label, key, a: aggregate(S.dropi.lines, S.meta || [], { ...f, prod: key, adsOverride: null }, mx) }));
  }

  // Una campaña puede venir en varias filas (desglose diario): se agregan dentro del filtro.
  function campaignRows(f) {
    if (!S.metrics) return null;
    return S.metrics.names.map((name) => ({
      name,
      assigned: S.map[name],
      a: aggregate([], [], { ...f, prod: '__all' }, { camps: S.metrics.camps.filter((c) => c.name === name), map: {} }),
    }));
  }

  function init() {
    app.render = render;
    app.filters.init();
    app.dataLoader.init();
    app.save.init();
    ui.diagnosisPanel.bindToggles();

    $('#funnel-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b || !S.current) return;
      S.funnelMode = b.dataset.mode;
      setPressed($('#funnel-mode'), '[data-mode]', b);
      ui.funnel.draw(S.current.a, S.funnelMode === 'pct');
    });

    // La cascada depende del ancho de su tarjeta.
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => S.current && ui.cascade.draw(S.current.a), 120); });

    ui.notices.render(null, S);
  }

  init();
})();
