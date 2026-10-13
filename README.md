# P&L COD · NovaSociety

Tablero de utilidad contra entrega (Dropi + Meta Ads). Se abre con doble clic en `index.html`: no necesita servidor ni compilación. Los archivos se procesan solo en el navegador.

## Arquitectura por capas

Cada capa solo usa las capas que están por encima en esta lista:

```
css/
  base.css            Tokens de diseño, base, tarjetas, filtros y botones
  components.css      KPIs, gráficas, embudo, diagnósticos, tablas, avisos, diálogos

js/
  core/               Lógica de negocio pura. Sin DOM: también corre en Node.
    parse.js          Texto normalizado, números locales, CSV, celdas de ExcelJS
    dates.js          Fechas ISO, etiquetas de periodo
    format.js         Formato es-CO (COP, %, x, montos compactos)
    dropi.js          Reporte de órdenes Dropi
    meta.js           Facturación y métricas de campañas Meta, asignación a producto
    pnl.js            Ciclos de producto, reparto de inversión, agregado del P&L
    diagnostics.js    Benchmarks del embudo y la cascada, historia ejecutiva (datos)
    insights.js       Periodo anterior, semanas, proyección de pedidos en ruta, simulador
    excel.js          Plantilla y escritura del consolidado de 20 columnas
    index.js          Solo Node: exporta todo el núcleo para pruebas

  services/           Adaptadores a APIs del navegador
    storage.js        localStorage (asignaciones) e IndexedDB (archivo vinculado)
    files.js          Lectura de .xlsx/.csv, selector y descarga
    consolidado.js    Archivo consolidado con File System Access (Chrome/Edge)

  ui/                 Componentes que pintan el DOM. Reciben datos por parámetro.
    dom.js, tooltip.js, feedback.js, upload-zones.js, notices.js, trend.js,
    summary.js, cascade.js, funnel.js, diagnosis-panel.js, unit-table.js,
    simulator.js, products-table.js, campaigns-table.js, presets.js

  app/                Estado y casos de uso; conecta core, services y ui
    state.js          Estado único de la aplicación
    filters.js        Filtros, selección de producto, periodos rápidos
    data-loader.js    Carga de reportes y asignación campaña → producto
    save.js           Guardar en el consolidado, exportar, cambiar archivo
    main.js           render() y arranque. Va siempre de último.
```

## Convenciones

- **Sin `import`/`export`.** Los navegadores bloquean los ES modules en `file://`. Cada archivo es un IIFE que publica su API en el namespace global `PYL` (`PYL.core.pnl`, `PYL.ui.funnel`, etc.).
- **El orden importa.** `index.html` carga los scripts en el orden de las capas. Un archivo nuevo va en su capa, antes de los que lo usan.
- **Solo la capa `app` modifica el estado.** Los componentes de `ui` reciben datos y callbacks (`onSelect`, `onAssign`).
- **Los diagnósticos devuelven datos, no HTML.** El texto con negritas se representa como segmentos: un string es texto plano y `{ b: '...' }` va en negrita. `ui/dom.js` (`rich`) los pinta.

## Pruebas en Node

```js
const core = require('./js/core/index.js');
const dropi = core.buildDropi(core.parseCSV(texto));
const a = core.aggregate(dropi.lines, [], { prod: '__all', from: null, to: null, iva: true, adsOverride: null }, null);
```
