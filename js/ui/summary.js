// Encabezado con veredicto, tarjetas KPI (semáforo, tooltip, cambio vs. periodo anterior y tendencia),
// proyección de pedidos en ruta e historia ejecutiva con opciones para compartirla.
(() => {
  const PYL = globalThis.PYL;
  const { $, rich, chip } = PYL.ui.dom;
  const { nf, fmt, short } = PYL.core.format;
  const { periodLabel } = PYL.core.dates;
  const { verdict } = PYL.core.diagnostics;
  const tooltip = PYL.ui.tooltip;
  const { toast } = PYL.ui.feedback;

  // Explicación de cada tarjeta, enlazada por data-tip en index.html.
  const TIPS = {
    util: { h: '💰 Utilidad neta real', p: 'El dinero líquido final que queda en tu bolsillo tras restar del recaudo en Dropi los costos de producto, fletes de entregas, fletes de devoluciones y toda la publicidad de Meta Ads.' },
    margen: { h: '📊 Margen neto real', p: 'Qué porcentaje de cada $100 pesos cobrados en efectivo se convirtió en ganancia limpia. Meta saludable en NovaSociety: 15% a 20%.' },
    efect: { h: '🚚 Efectividad de entrega', p: 'De los paquetes que salieron a carretera con guía y ya cerraron ciclo, qué porcentaje cobró la transportadora con éxito. Meta Nova: 70% a 75%+.' },
    roas: { h: '📈 ROAS real (cobrado / ads)', p: 'Cuántos pesos en EFECTIVO cobrado te devolvió cada $1 peso invertido en anuncios. Si tu ROAS real es menor al "Equilibrio", estás perdiendo dinero.' },
    cpa: { h: '🎯 CPA real por entrega', p: 'Cuánto dinero en publicidad tuviste que gastar para lograr que 1 cliente reciba y pague en mano. Si supera el "Máximo sostenible", cada entrega pierde dinero.' },
  };

  // [clave en a, formato, ¿más alto es mejor?]
  const KPIS = [['util', 'cop', true], ['margen', 'pct', true], ['efect', 'pct', true], ['roas', 'x', true], ['cpa', 'cop', false]];

  // Una sola vez al arrancar: tooltips de las etiquetas y botones de compartir.
  function init() {
    document.querySelectorAll('.kpis [data-tip]').forEach((n) => tooltip.attach(n, n.firstChild.textContent, TIPS[n.dataset.tip]));
    $('#story-copy').addEventListener('click', copyStory);
    $('#story-print').addEventListener('click', () => window.print());
  }

  function renderHeader(a, x) {
    $('#title').textContent = `${x.producto} · ${x.periodo || 'Todo el periodo'}`;
    const v = verdict(a.util, a.fact);
    const badge = $('#verdict');
    badge.className = 'badge lg ' + v.level; badge.textContent = v.label;
    const of = (v) => fmt(a.fact ? v / a.fact : null, 'pct');
    rich($('#take'), ['De cada peso cobrado, la mercancía se lleva ', { b: of(a.merc) }, ', los fletes ', { b: of(a.fletes) },
      ' y Meta Ads ', { b: of(a.ads) }, '.']);
  }

  // Cambio frente al periodo anterior: utilidad en pesos, márgenes en puntos, ROAS en x y CPA en %.
  function deltaText(k, kind, now, before) {
    const d = now - before;
    if (k === 'cpa') return fmt(before ? d / before : null, 'pct');
    if (kind === 'cop') return (d > 0 ? '+' : '') + short(d);
    if (kind === 'pct') return (d > 0 ? '+' : '') + nf(d * 100, { maximumFractionDigits: 1 }) + ' pts';
    return (d > 0 ? '+' : '') + nf(d, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x';
  }

  // prev: { from, to, a } del periodo anterior o null. weeks: semanas de core.insights.weeks.
  function renderKpis(a, prev, weeks) {
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

    KPIS.forEach(([k, kind, up]) => {
      const node = $('#d-' + k), now = a[k], before = prev && prev.a[k];
      if (now == null || before == null || !isFinite(now) || !isFinite(before)) { node.className = 'delta'; node.textContent = ''; node.title = ''; }
      else {
        const d = now - before, flat = Math.abs(d) < (kind === 'cop' ? 1 : 0.0005);
        node.className = 'delta ' + (flat ? '' : (d > 0) === up ? 'ok' : 'bad');
        node.textContent = `${flat ? '=' : d > 0 ? '▲' : '▼'} ${flat ? 'Igual' : deltaText(k, kind, now, before)} vs. periodo anterior`;
        node.title = `Periodo anterior (${periodLabel(prev.from, prev.to)}): ${fmt(before, kind)}`;
      }
      PYL.ui.trend.spark('#s-' + k, weeks.map((w) => ({ v: w.a[k], w })), kind, TIPS[k].h.replace(/^\S+\s/, ''));
    });
  }

  // p: core.insights.projection(a) o null.
  function renderProjection(p) {
    const box = $('#proj');
    box.classList.toggle('hidden', !p);
    if (!p) return;
    rich(box, ['🚚 ', { b: `${nf(p.ruta)} pedidos en ruta.` }, ' Si cierran con tu efectividad actual (', { b: fmt(p.efect, 'pct') },
      ') serían ≈', { b: nf(Math.round(p.ent)) }, ' entregas más y la utilidad pasaría a ', { b: fmt(p.util, 'cop') },
      ` (${p.extra >= 0 ? '+' : ''}${short(p.extra)}). La pauta de esos pedidos ya está pagada.`]);
    box.className = 'proj ' + (p.util >= 0 ? 'ok' : 'bad');
  }

  // story: segmentos de PYL.core.diagnostics.story.
  function renderStory(story) { rich($('#story'), story); }

  // Resumen en texto plano (para WhatsApp o correo) a partir de lo que muestra el tablero.
  function shareText() {
    const t = (s) => $(s).textContent.trim();
    const lines = [t('#title'), t('#verdict'), ''];
    document.querySelectorAll('.kpis .card').forEach((c) => {
      const chipTxt = c.querySelector('.chip').textContent;
      lines.push(`• ${c.querySelector('[data-tip]').firstChild.textContent}: ${c.querySelector('.k-val').textContent}${chipTxt ? ` (${chipTxt})` : ''}`);
    });
    lines.push('', t('#story'));
    if (!$('#proj').classList.contains('hidden')) lines.push('', t('#proj'));
    return lines.join('\n');
  }

  async function copyStory() {
    const text = shareText();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (!ok) { toast('No pude copiar el resumen. Tu navegador bloqueó el portapapeles.', 'error'); return; }
    }
    toast('Resumen copiado: pégalo en WhatsApp o en un correo.', 'ok');
  }

  PYL.ui.summary = { init, renderHeader, renderKpis, renderProjection, renderStory };
})();
