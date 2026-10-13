# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Tablero P&L contra entrega (COD) de NovaSociety: cruza el reporte de órdenes de Dropi (.xlsx/.csv) con la facturación y métricas de Meta Ads. Todo corre en el navegador; UI y textos en español (es-CO). Ver `README.md` para el mapa de capas completo.

## Ejecutar y probar

- **Sin build, sin servidor, sin dependencias npm.** Se abre con doble clic en `index.html` (`file://`). Única dependencia externa: ExcelJS por CDN.
- **No hay runner de pruebas.** El núcleo (`js/core/`) no toca el DOM y se prueba en Node:
  ```sh
  node -e "const core = require('./js/core/index.js'); /* core.aggregate, core.story, ... */"
  node --check js/ui/summary.js   # chequeo de sintaxis de cualquier archivo
  ```
  `js/core/index.js` carga los módulos del núcleo en orden y exporta todas sus funciones aplanadas (`core.aggregate`, `core.buildDropi`, `core.parseCSV`, `core.story`...). Al crear un archivo nuevo en `core/`, agregarlo también a la lista de `index.js`.

## Reglas de arquitectura (no romper)

- **Nada de `import`/`export` ni ES modules**: se bloquean en `file://`. Cada archivo es un IIFE que publica en el namespace global `PYL` (`PYL.core.*`, `PYL.services.*`, `PYL.ui.*`, `PYL.app.*`).
- **Orden de `<script>` en `index.html` = orden de capas**: `core → services → ui → app`, y `app/main.js` siempre al final (ahí arranca la app). Un archivo nuevo va dentro de su capa, antes de quien lo usa.
- Cada capa solo usa las anteriores. `core` no toca DOM. `ui` recibe datos y callbacks por parámetro y nunca modifica estado. Solo `app` muta `app.state` (`js/app/state.js`).
- **Los diagnósticos/textos dinámicos devuelven datos, no HTML**: arreglos de segmentos donde un string es texto plano y `{ b: '...' }` va en negrita; `PYL.ui.dom.rich(node, segments)` los pinta. Las reglas de negocio con benchmarks viven en `core/diagnostics.js` (`funnel`, `cascade`, `story`).
- Estilos solo en `css/base.css` (tokens, base, tarjetas, filtros) y `css/components.css`; nada de `<style>` embebido en `index.html`.
- Los archivos del repo usan finales de línea LF.

## Flujo de render

`app/main.js#render()` es el único punto de pintado y se llama ante cualquier cambio (archivos, filtro de producto/fechas, IVA, presets):
1. `app.filters.read()` arma el filtro `f` (`prod`, `from`, `to`, `iva`, `adsOverride`).
2. `core.pnl.aggregate(lines, meta, f, mx)` devuelve el objeto `a` con todo el P&L del filtro.
3. Cada componente `ui.*` recibe `a` (y `x` = extras como `producto`/`periodo`) y se repinta. `S.current = { a, x, f }` guarda el último cálculo para redibujos parciales (resize, modo del embudo).

Tooltips: un único nodo flotante `#tip` (`ui/tooltip.js`). `infoLabel(name, tip)` / `attach(node, name, tip)` agregan el ícono "i" con explicación `{ h, p, li? }`. Los paneles desplegables usan `.diag-btn[aria-controls]` + `.diag-panel`; `ui.diagnosisPanel.bindToggles()` los conecta todos automáticamente.

## Modelo de negocio (objeto `a` de `aggregate`)

Conteos por pedido único Dropi: `rec` (recibidos), `can`, `ent` (entregados), `dev` (devueltos), `ruta`. Montos solo de entregados/devueltos:
- `fact` = cobrado de entregados; `merc` = costo proveedor; `fletes = fEnt + fDevIda + fRet`.
- `wallet = fact − merc − fletes` (lo que queda antes de publicidad); `util = wallet − ads`.
- `margen = util/fact`, `efect = ent/(ent+dev)`, `roas = fact/ads`, `roasEq = fact/wallet`, `cpa = ads/ent`, `cpaMax = wallet/ent`. Consecuencia: `util < 0 ⇔ cpa > cpaMax ⇔ roas < roasEq` (con `ent > 0`).
- `ads`: suma de cargos de facturación Meta en el rango (con IVA = cargo de tarjeta; sin IVA = ÷1,19). Por producto, cada cargo se asigna al producto con pedidos activos en esa fecha (ciclos de Dropi) y se reparte por gasto de campañas si hay solapamiento. Sin facturación se usan las métricas de campañas. En cuentas prepago solo cuenta el gasto, no las recargas.
- `fmt(v, 'cop'|'pct'|'x')` de `core/format.js` devuelve `'—'` para null/no finitos; `div()` devuelve null si el divisor es 0.

Benchmarks NovaSociety usados en semáforos y diagnósticos: efectividad ≥ 70%, devoluciones ≤ 25%, cancelación 15–20%, efectividad global (entregados/recibidos) ~60%, margen neto sano 15–20%, fletes ≤ 25% de lo cobrado, Ads ≤ 60% de la Wallet.
