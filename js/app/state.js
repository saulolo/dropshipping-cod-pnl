// Estado único de la aplicación. Solo la capa app lo modifica; la UI recibe datos por parámetro.
(() => {
  const app = (globalThis.PYL.app ??= {});

  app.state = {
    dropi: null,      // { lines, noDate, orders, gifts, giftNames } de core.dropi.buildDropi
    meta: null,       // cargos de facturación Meta: [{ date, amt, method }]
    metaInfo: null,   // resumen de la facturación (prepago, omitidos, divisas)
    metrics: null,    // { camps, names, from, to } de core.meta.buildMetrics
    map: {},          // campaña → producto asignado (null = sin asignar)
    prod: '__all',    // producto seleccionado
    iva: true,        // inversión Meta con IVA
    funnelMode: 'n',  // embudo en unidades ('n') o porcentajes ('pct')
    current: null,    // último cálculo mostrado: { a, x, f }
  };
})();
