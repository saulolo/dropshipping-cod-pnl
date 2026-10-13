// Encabezado (título y frase resumen), tarjetas KPI con su semáforo y tooltip, e historia ejecutiva.
(() => {
  const PYL = globalThis.PYL;
  const { $, rich, chip } = PYL.ui.dom;
  const { nf, fmt } = PYL.core.format;
  const tooltip = PYL.ui.tooltip;

  // Explicación de cada tarjeta, enlazada por data-tip en index.html.
  const TIPS = {
    util: { h: '💰 Utilidad neta real', p: 'El dinero líquido final que queda en tu bolsillo tras restar del recaudo en Dropi los costos de producto, fletes de entregas, fletes de devoluciones y toda la publicidad de Meta Ads.' },
    margen: { h: '📊 Margen neto real', p: 'Qué porcentaje de cada $100 pesos cobrados en efectivo se convirtió en ganancia limpia. Meta saludable en NovaSociety: 15% a 20%.' },
    efect: { h: '🚚 Efectividad de entrega', p: 'De los paquetes que salieron a carretera con guía y ya cerraron ciclo, qué porcentaje cobró la transportadora con éxito. Meta Nova: 70% a 75%+.' },
    roas: { h: '📈 ROAS real (cobrado / ads)', p: 'Cuántos pesos en EFECTIVO cobrado te devolvió cada $1 peso invertido en anuncios. Si tu ROAS real es menor al "Equilibrio", estás perdiendo dinero.' },
    cpa: { h: '🎯 CPA real por entrega', p: 'Cuánto dinero en publicidad tuviste que gastar para lograr que 1 cliente reciba y pague en mano. Si supera el "Máximo sostenible", cada entrega pierde dinero.' },
  };

  // Una sola vez al arrancar: las etiquetas de las tarjetas son estáticas.
  function bindKpiTips() {
    document.querySelectorAll('.kpis [data-tip]').forEach((n) => tooltip.attach(n, n.firstChild.textContent, TIPS[n.dataset.tip]));
  }

  function renderHeader(a, x) {
    $('#title').textContent = `${x.producto} · ${x.periodo || 'Todo el periodo'}`;
    rich($('#take'), ['Utilidad neta real de ', { b: fmt(a.util, 'cop') }, ' con margen de ', { b: fmt(a.margen, 'pct') },
      '. Fletes y Meta Ads se llevan ', { b: fmt(a.pesoCostos, 'pct') }, ' de lo cobrado. ROAS real ',
      { b: fmt(a.roas, 'x') }, ' frente a un equilibrio de ', { b: fmt(a.roasEq, 'x') }, '.']);
  }

  function renderKpis(a) {
    $('#k-util').textContent = fmt(a.util, 'cop');
    $('#k-util').className = 'k-val ' + (a.util >= 0 ? '' : 'bad');
    $('#k-util-f').textContent = `Wallet ${fmt(a.wallet, 'cop')} − Ads ${fmt(a.ads, 'cop')} (${a.withIva ? 'con' : 'sin'} IVA)`;
    $('#k-margen').textContent = fmt(a.margen, 'pct');
    $('#k-efect').textContent = fmt(a.efect, 'pct');
    $('#k-efect-f').textContent = `${nf(a.ent)} entregados · ${nf(a.dev)} devueltos`;
    $('#k-roas').textContent = fmt(a.roas, 'x');
    $('#k-roas-eq').textContent = fmt(a.roasEq, 'x');
    $('#k-cpa').textContent = fmt(a.cpa, 'cop');
    $('#k-cpa-max').textContent = fmt(a.cpaMax, 'cop');

    chip('#c-util', a.util > 0 ? 'ok' : 'bad', a.util > 0 ? 'Positiva' : 'Pérdida');
    if (a.margen != null) chip('#c-margen', a.margen >= 0.2 ? 'ok' : a.margen >= 0 ? 'warn' : 'bad', a.margen >= 0.2 ? 'Sano (≥ 20%)' : a.margen >= 0 ? 'Bajo meta de 20%' : 'Negativo'); else chip('#c-margen');
    if (a.efect != null) chip('#c-efect', a.efect >= 0.7 ? 'ok' : a.efect >= 0.6 ? 'warn' : 'bad', a.efect >= 0.7 ? 'Sobre meta de 70%' : 'Bajo meta de 70%'); else chip('#c-efect');
    if (!a.ads) chip('#c-roas', 'warn', 'Sin gasto Ads cargado');
    else if (a.roas != null && a.roasEq != null && a.roasEq > 0) {
      const h = a.roas / a.roasEq - 1;
      chip('#c-roas', h >= 0.15 ? 'ok' : h >= 0 ? 'warn' : 'bad', h >= 0.15 ? 'Con holgura' : h >= 0 ? 'En el límite' : 'Bajo equilibrio');
    } else chip('#c-roas', 'bad', 'Wallet negativa');
    if (a.cpa != null && a.cpaMax != null && a.cpaMax > 0 && a.ads) {
      const h = 1 - a.cpa / a.cpaMax;
      chip('#c-cpa', h >= 0.15 ? 'ok' : h >= 0 ? 'warn' : 'bad', h >= 0.15 ? 'Con holgura' : h >= 0 ? 'En el límite' : 'Sobre el máximo');
    } else chip('#c-cpa');
  }

  // story: segmentos de PYL.core.diagnostics.story.
  function renderStory(story) { rich($('#story'), story); }

  PYL.ui.summary = { bindKpiTips, renderHeader, renderKpis, renderStory };
})();
