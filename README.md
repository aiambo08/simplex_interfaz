# Visualizador Símplex

Aplicación web para **visualizar paso a paso el método Símplex y el Símplex Dual** de un problema
de Programación Lineal, pensada como herramienta de estudio para Investigación Operativa
(UPM, Grado en Ciencia de Datos e IA). Aritmética exacta con fracciones, tabla Símplex animada
con explicaciones en lenguaje natural y gráficos de la región factible y de la evolución del
algoritmo.

> Estado: **F0 — esqueleto del proyecto**. Las funcionalidades se añaden por fases (ver abajo).

## Stack

- React 19 + Vite 7 + TypeScript 5.9, TailwindCSS 4
- Aritmética exacta: `fraction.js`
- Tests: Vitest + Testing Library
- Despliegue estático en Vercel (sin backend)

## Instalación y uso

```bash
npm ci          # instala dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173
npm run check   # lint + tipos + tests + build (lo mismo que ejecuta la CI)
```

Scripts disponibles:

| Script                  | Qué hace                                  |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Servidor de desarrollo con recarga        |
| `npm run build`         | Comprueba tipos y genera `dist/`          |
| `npm run preview`       | Sirve `dist/` localmente                  |
| `npm run lint`          | ESLint (reglas estrictas de TypeScript)   |
| `npm run format`        | Formatea con Prettier                     |
| `npm run typecheck`     | `tsc -b`                                  |
| `npm run test`          | Vitest (una pasada)                       |
| `npm run test:coverage` | Vitest con cobertura del módulo `solver/` |

## Estructura

```
src/
  solver/       # TS puro: parseo, forma estándar, Símplex primal y dual, snapshots
  components/   # UI: entrada, tabla Símplex, gráficos, layout
  state/        # sesión (snapshots + iteración actual + método)
  examples/     # problemas precargados
  test/         # configuración de Vitest
```

## Fases

| Fase | Contenido                                                             | Estado |
| ---- | --------------------------------------------------------------------- | ------ |
| F0   | Esqueleto, CI, Vercel                                                 | ✅     |
| (a)  | Solver puro con fracciones + tests                                    | ⬜     |
| (b)  | Tabla Símplex con stepper, explicaciones, panel matricial y entrada   | ⬜     |
| (c)  | Gráfico 2D de región factible y trayectoria                           | ⬜     |
| (d)  | Gráficos de evolución (z, básicas, costes reducidos, holguras, 3D)    | ⬜     |
| (e)  | Símplex Dual, modo automático y problema dual                         | ⬜     |
| (f)  | Casos especiales (óptimo, no acotado, infactible, degeneración, alt.) | ⬜     |
| (g)  | Extras (sensibilidad, quiz, exportación, Gran M)                      | ⬜     |

## Despliegue en Vercel

El proyecto es un build estático: importa el repositorio en Vercel, detecta Vite automáticamente
y usa `vercel.json` (build `npm run build`, salida `dist/`).

## Licencia

MIT
