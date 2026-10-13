// Lecturas derivadas del P&L: periodo anterior, tendencia semanal, proyección de pedidos en ruta y simulador.
(() => {
  const core = globalThis.PYL.core;
  const { addDays } = core.dates;
  const { aggregate } = core.pnl;

  const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;

  // Rango de igual duración que termina el día antes de `from`. Null si el filtro no tiene fechas.
  function previousRange(from, to) {
    if (!from || !to) return null;
    const n = days(from, to);
    return { from: addDays(from, -n), to: addDays(from, -1) };
  }

  // P&L del periodo anterior con la inversión automática (la manual solo vale para el periodo actual).
  // Null si en ese rango no hubo nada cobrado: no hay base de comparación.
  function previous(lines, meta, f, mx) {
    const r = previousRange(f.from, f.to);
    if (!r) return null;
    const a = aggregate(lines, meta, { ...f, ...r, adsOverride: null }, mx);
    return a.fact > 0 ? { ...r, a } : null;
  }

  // Semanas de lunes a domingo recortadas al filtro. partial: la semana no cae completa en el rango.
  function weeks(lines, meta, f, mx) {
    if (!f.from || !f.to) return [];
    const out = [];
    const dow = (d) => (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7;
    for (let s = addDays(f.from, -dow(f.from)); s <= f.to; s = addDays(s, 7)) {
      const e = addDays(s, 6);
      const from = s < f.from ? f.from : s, to = e > f.to ? f.to : e;
      out.push({ from, to, partial: from !== s || to !== e, a: aggregate(lines, meta, { ...f, from, to, adsOverride: null }, mx) });
    }
    return out;
  }

  // Pedidos en ruta: si cierran con la efectividad actual, cada entrega suma lo que hoy deja a la
  // Wallet por entrega (cpaMax, que ya descuenta las devoluciones). La pauta ya está pagada.
  function projection(a) {
    if (!a.ruta || a.efect == null || a.cpaMax == null) return null;
    const ent = a.ruta * a.efect;
    const extra = ent * a.cpaMax;
    return { ruta: a.ruta, efect: a.efect, ent, extra, util: a.util + extra };
  }

  // Valores por pedido cerrado que alimentan el simulador. Sin devoluciones, cada devolución se
  // estima como dos fletes de entrega (ida + retorno).
  function unitBase(a) {
    if (!a.ent) return null;
    return {
      cerrados: a.ent + a.dev,
      efect: a.efect,
      ticket: a.fact / a.ent,
      merc: a.merc / a.ent,
      cpa: a.ads / a.ent,
      fEnt: a.fEnt / a.ent,
      fDev: a.dev ? (a.fDevIda + a.fRet) / a.dev : (2 * a.fEnt) / a.ent,
    };
  }

  // Recalcula el P&L con los mismos pedidos cerrados y otras palancas. Con los valores de unitBase
  // reproduce la utilidad real del filtro.
  function simulate(base, p) {
    const ent = base.cerrados * p.efect, dev = base.cerrados - ent;
    const fact = ent * p.ticket, merc = ent * p.merc, fletes = ent * base.fEnt + dev * base.fDev;
    const wallet = fact - merc - fletes, ads = ent * p.cpa, util = wallet - ads;
    const div = (x, y) => (y ? x / y : null);
    return {
      ent, dev, fact, wallet, ads, util,
      margen: div(util, fact), roas: div(fact, ads), roasEq: div(fact, wallet), cpaMax: div(wallet, ent),
      // CPA máximo para cerrar con margen de 15% (piso de la meta Nova).
      cpaMeta: div(wallet - 0.15 * fact, ent),
    };
  }

  core.insights = { previousRange, previous, weeks, projection, unitBase, simulate };
})();
