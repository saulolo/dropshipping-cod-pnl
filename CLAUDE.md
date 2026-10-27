# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

App de NovaSociety con dos partes en una sola página (`index.html`, pestañas en la barra superior):
- **Entrenador de métricas** (Inicio, Costeo, Hard Metrics, Simulador, Escalera, Creativos): método de Juan Herrera. Fase 1: vive en `js/app/trainer.js`, copiado del prototipo `docs/referencia/novasociety-metricas-v2.html` sin cambios de lógica; también maneja la navegación entre pestañas. Fase 2 pendiente: separarlo en core/ui con tests.
- **Tablero P&L** (pestaña `#v-pyl`): P&L contra entrega (COD); cruza el reporte de órdenes de Dropi (.xlsx/.csv) con la facturación y métricas de Meta Ads.

Todo corre en el navegador; UI y textos en español (es-CO). Ver `README.md` para el mapa de capas completo.

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
- **Los diagnósticos/textos dinámicos devuelven datos, no HTML**: arreglos de segmentos donde un string es texto plano y `{ b: '...' }` va en negrita; `PYL.ui.dom.rich(node, segments)` los pinta. Las reglas de negocio con benchmarks viven en `core/diagnostics.js` (`funnel`, `cascade`, `story`, `verdict`).
- Estilos solo en `css/base.css` (sistema de diseño del entrenador: tokens, barra superior, tarjetas, botones, campos, tablas y módulos del entrenador; al final, alias de tokens del tablero como `--panel`, `--accent`, `--ok`), `css/components.css` (solo lo propio del tablero P&L, acotado a `#v-pyl` cuando choca con base) y `css/report.css` (informe PDF, tema claro); nada de `<style>` embebido en `index.html`.
- Tema claro/oscuro: `js/app/theme.js` (se carga en `<head>`, antes de pintar) pone `<html data-theme>` y lo recuerda en `localStorage` (`pyl-theme`). El modo claro son overrides `[data-theme="light"]` al final de `base.css`: tokens y, para colores fijos en SVG o en las gráficas (`#cascade`, `#trend`, `.chain-svg`, `#donut`), selectores de atributo como `text[fill="#e7eaf0"]`. Si cambias un color fijo en `js/ui`, actualiza ese selector.
- IDs únicos en toda la página: el entrenador usa `#t-verdict` y `#c-cpa-esp` porque `#verdict` y `#c-cpa` son del tablero. `#toast` es compartido.
- Al mostrar la pestaña del tablero, `trainer.js#go` dispara `resize` para que la cascada y la tendencia se midan con la tarjeta visible.
- Los archivos del repo usan finales de línea LF.

## Flujo de render

`app/main.js#render()` es el único punto de pintado y se llama ante cualquier cambio (archivos, filtro de producto/fechas, IVA, presets):
1. `app.filters.read()` arma el filtro `f` (`prod`, `from`, `to`, `iva`, `adsOverride`).
2. `core.pnl.aggregate(lines, meta, f, mx)` devuelve el objeto `a` con todo el P&L del filtro.
3. `core/insights.js` deriva lecturas extra con el mismo `aggregate`: `previous` (rango de igual duración justo antes, para los deltas de los KPI), `weeks` (semanas lunes–domingo recortadas al filtro: mini-líneas y gráfica semanal), `projection` (pedidos en ruta × efectividad × `cpaMax`) y `unitBase`/`simulate` (simulador; con los valores reales reproduce `util` exacto). Estas lecturas usan siempre la inversión automática (`adsOverride: null`).
4. Cada componente `ui.*` recibe `a` (y `x` = extras como `producto`/`periodo`) y se repinta. `S.current = { a, x, f, weeks }` guarda el último cálculo para redibujos parciales (resize, modo del embudo).

Informe PDF: `app/report.js` toma `S.current` y llama a `ui.report.print`, que arma el documento en `#report` (fuera de `.wrap`), pone `body.print-report` y abre `window.print()`; `css/report.css` oculta todo lo demás al imprimir. El informe reutiliza la misma lógica que el tablero: `diagnostics.kpis/story/verdict/funnel/cascade`, `insights.actions/unitEconomics/projection`, `ui.summary.TIPS/delta` y `ui.notices.list`. Al agregar un indicador o regla, hazlo en `core` para que ambos lo muestren igual.

Tooltips: un único nodo flotante `#tip` (`ui/tooltip.js`). `infoLabel(name, tip)` / `attach(node, name, tip)` agregan el ícono "i" con explicación `{ h, p, li? }`. Los paneles desplegables usan `.diag-btn[aria-controls]` + `.diag-panel`; `ui.diagnosisPanel.bindToggles()` los conecta todos automáticamente.

## Modelo de negocio (objeto `a` de `aggregate`)

Conteos por pedido único Dropi: `rec` (recibidos), `can`, `ent` (entregados), `dev` (devueltos), `ruta`. Montos solo de entregados/devueltos:
- `fact` = cobrado de entregados; `merc` = costo proveedor; `fletes = fEnt + fDevIda + fRet`.
- `wallet = fact − merc − fletes` (lo que queda antes de publicidad); `util = wallet − ads`.
- `margen = util/fact`, `efect = ent/(ent+dev)`, `roas = fact/ads`, `roasEq = fact/wallet`, `cpa = ads/ent`, `cpaMax = wallet/ent`. Consecuencia: `util < 0 ⇔ cpa > cpaMax ⇔ roas < roasEq` (con `ent > 0`).
- `ads`: suma de cargos de facturación Meta en el rango (con IVA = cargo de tarjeta; sin IVA = ÷1,19). Por producto, cada cargo se asigna al producto con pedidos activos en esa fecha (ciclos de Dropi) y se reparte por gasto de campañas si hay solapamiento. Sin facturación se usan las métricas de campañas. En cuentas prepago solo cuenta el gasto, no las recargas.
- `fmt(v, 'cop'|'pct'|'x')` de `core/format.js` devuelve `'—'` para null/no finitos; `div()` devuelve null si el divisor es 0.

Benchmarks NovaSociety usados en semáforos y diagnósticos: efectividad ≥ 70%, devoluciones ≤ 25%, cancelación 15–20%, efectividad global (entregados/recibidos) ~60%, margen neto con cortes únicos en `MARGIN` de `core/diagnostics.js` (±2% equilibrio, 15% mínimo sano = veredicto Ganador, 20% ideal; no duplicar estos números), fletes ≤ 25% de lo cobrado, Ads ≤ 60% de la Wallet.
