// Diagnósticos frente a los benchmarks NovaSociety. Devuelven datos, no DOM:
//   rows: [{ name, desc, value, bench, level: 'ok'|'warn'|'bad'|'', text }]
//   conclusion: segmentos de texto; un string es texto plano y { b } va en negrita.
(() => {
  const core = globalThis.PYL.core;
  const { nf, fmt } = core.format;

  const NO_DATA = 'Sin datos suficientes en este filtro.';
  const b = (text) => ({ b: text });
  const row = (name, desc, value, bench, dx) => ({ name, desc, value, bench, level: dx ? dx[0] : '', text: dx ? dx[1] : NO_DATA });

  // Embudo logístico. "Despachados" aquí = entregados + devueltos (en ruta aún no cuenta).
  function funnel(a, producto) {
    const cerr = a.ent + a.dev;
    const canR = a.rec ? a.can / a.rec : null;
    const entR = cerr ? a.ent / cerr : null;
    const devR = cerr ? a.dev / cerr : null;
    const globR = a.rec ? a.ent / a.rec : null;
    const pct = (v) => fmt(v, 'pct');
    const pts = (v) => nf(Math.abs(v) * 100, { maximumFractionDigits: 1 }) + ' pts';

    const rows = [
      row('Tasa de cancelación', 'Filtro en WhatsApp · cancelados / recibidos', pct(canR), '~15% a 20%',
        canR == null ? null
          : canR > 0.3 ? ['bad', 'Alerta: fuga excesiva de clientes en WhatsApp.']
          : canR > 0.25 ? ['warn', 'En el límite: sobre el rango ideal. Revisa el guion de confirmación.']
          : canR >= 0.15 ? ['ok', 'Saludable: buen filtro preventivo de pedidos falsos/duplicados.']
          : canR >= 0.1 ? ['warn', 'Ligeramente bajo el rango ideal: confirma con más rigor.']
          : ['warn', 'Alerta: podrías estar despachando pedidos sin confirmar.']),
      row('Efectividad de entrega', 'Entregados / (entregados + devueltos)', pct(entR), '70% a 75%+',
        entR == null ? null
          : entR >= 0.7 ? ['ok', 'Excelente: transporte en rango saludable de la industria.']
          : ['bad', 'Bajo: problemas de entrega con transportadoras o direcciones incompletas.']),
      row('Tasa de devolución', 'Devueltos / (entregados + devueltos)', pct(devR), 'Máximo 25%',
        devR == null ? null
          : devR <= 0.25 ? ['ok', 'En control.']
          : ['warn', 'Alerta: fuga en fletes dobles. Revisa exclusión de zonas rojas.']),
      row('Efectividad operativa global', 'Regla 20/20/60 · entregados / recibidos', pct(globR), '~60% (Meta Reina)',
        globR == null ? null
          : globR >= 0.6 ? ['ok', `Meta Reina alcanzada: ${pts(globR - 0.6)} sobre el 60%.`]
          : [globR >= 0.5 ? 'warn' : 'bad', `A ${pts(0.6 - globR)} de la Meta Reina del 60%.` + (a.ruta ? ` ${nf(a.ruta)} pedidos en ruta aún pueden sumar.` : '')]),
    ];

    if (entR == null) return { rows, conclusion: ['Aún no hay pedidos entregados ni devueltos en este filtro para emitir un diagnóstico.'] };
    const okE = entR >= 0.7, okD = devR <= 0.25;
    const conclusion = [
      producto === 'Consolidado' ? 'Tu operación consolidada ' : `Tu operación con ${producto} `,
      okE ? 'superó' : 'quedó bajo', ' el benchmark de transportadora (', b(pct(entR)), ')',
      okE === okD ? ' y ' : ', pero ',
      okD ? 'las devoluciones están en control (' : 'las devoluciones (', b(pct(devR)),
      okD ? ').' : ') absorbieron parte del margen neto.', ' ',
      !okE || !okD ? 'Priorizar confirmación de dirección y exclusión de zonas rojas.'
        : canR > 0.3 ? 'Priorizar recuperación de clientes en WhatsApp.'
        : canR < 0.1 ? 'Reforzar la confirmación antes de despachar.'
        : globR < 0.6 ? 'Cerrar los pedidos en ruta para acercarte a la Meta Reina del 60%.'
        : 'Mantener el filtro actual: la operación está en rango Nova.',
    ];
    return { rows, conclusion };
  }

  // Cascada P&L: % de cada barra sobre lo cobrado (Ads sobre la Wallet) y conclusión según el escenario.
  function cascade(a) {
    const fact = a.fact, has = fact > 0;
    const retM = has ? (fact - a.merc) / fact : null;
    const flR = has ? a.fletes / fact : null;
    const walR = has ? a.wallet / fact : null;
    const adsR = has ? a.ads / fact : null;
    // Wallet ≤ 0 con gasto en Ads: la pauta consume más del 100% por definición.
    const adsW = a.wallet > 0 ? a.ads / a.wallet : a.ads > 0 ? Infinity : null;
    const P = (v) => (v === Infinity ? 'Wallet ≤ 0' : fmt(v, 'pct'));

    const rows = [
      row('Retención tras Mercancía', '% de lo cobrado que queda tras pagar a bodega', P(retM), '≥ 70%',
        retM == null ? null : retM >= 0.7 ? ['ok', 'Costo de producto sano frente al ticket.'] : ['warn', 'La mercancía pesa demasiado: negocia costo o sube el ticket con combos.']),
      row('Impacto de Fletes', 'Entregas + devoluciones sobre lo cobrado', P(flR), '≤ 25%',
        flR == null ? null : flR <= 0.25 ? ['ok', 'Fletes controlados.'] : flR < 0.35 ? ['warn', 'Fletes en zona de alerta: revisa devoluciones y zonas rojas.'] : ['bad', 'Fuga crítica en fletes: las devoluciones están drenando la operación.']),
      row('Eficiencia de Wallet Dropi', '% de lo cobrado que llega a la billetera antes de Ads', P(walR), '≥ 45%',
        walR == null ? null : walR >= 0.45 ? ['ok', 'Buena caja disponible para pautar.'] : ['warn', 'Poca caja antes de Ads: cualquier CPA alto se come la ganancia.']),
      row('Presión de Meta Ads', '% de la Wallet que consumió la publicidad', P(adsW), '≤ 60%',
        adsW == null ? null : adsW <= 0.6 ? ['ok', 'Pauta eficiente frente a la Wallet.'] : adsW < 1 ? ['warn', 'La pauta se lleva la mayor parte de la Wallet: margen estrecho.'] : ['bad', 'La pauta superó la Wallet: cada venta pierde dinero.']),
    ];

    if (!has) return { rows, conclusion: ['Sin facturación cobrada en este filtro: no hay cascada que diagnosticar.'] };
    const m = a.margen, flBad = flR >= 0.35, adsBad = adsW != null && adsW >= 1;
    let conclusion;
    // El equilibrio va primero: un margen de ±3% se lee como tablas aunque la utilidad tenga signo.
    if (Math.abs(m) <= 0.03) {
      conclusion = ['⚖️ ', b('Punto de Equilibrio:'), ' la barra de Meta Ads absorbió prácticamente el 100% de lo generado en la Wallet (',
        b(P(adsW)), ' de la Wallet, margen ', b(fmt(m, 'pct')), '). El producto financió su aprendizaje a costo cero. Para pasarlo a verde: subir el ticket promedio vendiendo combos o reducir el CPA.'];
    } else if (a.util > 0 && m >= 0.15) {
      conclusion = ['🚀 ', b('Producto Ganador:'), ' excelente salud financiera. Tu retención en Wallet (', b(P(walR)),
        ') superó ampliamente la inversión en Ads (', b(P(adsR)), '), logrando que la barra de Utilidad cierre con un margen neto del ', b(P(m)),
        '. La combinación de fletes controlados y un CPA eficiente blindaron tu ganancia.'];
    } else if (a.util > 0) {
      const flHi = flR > 0.25, adsHi = adsW > 0.6;
      const cuello = flHi && adsHi ? ['El cuello de botella es doble: fletes (', b(P(flR)), ' de lo cobrado) y CPA (Ads se lleva ', b(P(adsW)), ' de la Wallet). Ataca ambos']
        : flHi ? ['El cuello de botella son los fletes (', b(P(flR)), ' de lo cobrado): baja devoluciones y excluye zonas rojas']
        : adsHi ? ['El cuello de botella es el CPA: Ads consume ', b(P(adsW)), ' de la Wallet. Optimiza creativos y segmentación']
        : ['El cuello de botella es la mercancía (', b(P(1 - retM)), ' del ticket): negocia costo o sube el ticket con combos'];
      conclusion = ['🟡 ', b('Producto Rentable pero en Zona Límite:'), ' el producto deja ganancia (', b(fmt(a.util, 'cop')), '), pero el margen (', b(P(m)), ') es estrecho. ', ...cuello, ' para poder escalarlo con seguridad.'];
    } else {
      const causa = flBad && adsBad ? ['Doble pinza: pauta costosa (Ads consumió ', b(P(adsW)), ' de la Wallet) y fletes altos (', b(P(flR)), ' de lo cobrado). Hay que corregir ambos frentes a la vez.']
        : flBad ? ['Causa raíz: fuga en fletes de devolución. Los fletes se llevaron ', b(P(flR)), ' de lo cobrado. Prioriza confirmación de dirección y exclusión de zonas rojas.']
        : adsBad ? ['Causa raíz: CPA publicitario insostenible frente al ticket cobrado. Ads consumió ', b(P(adsW)), ' de la Wallet.']
        : ['Ninguna barra cruzó su límite crítico, pero la suma pesa: mercancía ', b(P(1 - retM)), ', fletes ', b(P(flR)), ' y Ads ', b(P(adsW)), ' de la Wallet. Recorta el mayor de ellos.'];
      conclusion = ['🔻 ', b('Producto en Pérdida:'), ' la Utilidad cierra en ', b(fmt(a.util, 'cop')), ' (margen ', b(P(m)), '). ', ...causa];
    }
    return { rows, conclusion };
  }

  core.diagnostics = { funnel, cascade };
})();
