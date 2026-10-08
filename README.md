# Visualizador Símplex

Aplicación web para **visualizar paso a paso el método Símplex y el Símplex Dual** de un problema
de Programación Lineal, pensada como herramienta de estudio para Investigación Operativa
(UPM, Grado en Ciencia de Datos e IA). Aritmética exacta con fracciones, tabla Símplex animada
con explicaciones en lenguaje natural y gráficos de la región factible y de la evolución del
algoritmo.

> Estado: **fase (d) — gráficas de evolución por iteración y vista 3D del poliedro**.
> Las funcionalidades se añaden por fases (ver abajo).

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

| Script                  | Qué hace                                |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Servidor de desarrollo con recarga      |
| `npm run build`         | Comprueba tipos y genera `dist/`        |
| `npm run preview`       | Sirve `dist/` localmente                |
| `npm run lint`          | ESLint (reglas estrictas de TypeScript) |
| `npm run format`        | Formatea con Prettier                   |
| `npm run typecheck`     | `tsc -b`                                |
| `npm run test`          | Vitest (una pasada)                     |
| `npm run test:coverage` | Vitest con cobertura                    |

## Cómo se usa

1. **Introduce el problema** en la pestaña que prefieras:
   - **Ejemplos**: pulsa uno de los problemas precargados (2 variables, 3 variables, minimización
     con `≥` resuelta con Símplex Dual, degeneración, óptimos alternativos, no acotado, infactible).
   - **Formulario guiado**: elige Maximizar/Minimizar, nº de variables (1–6), coeficientes de z y
     restricciones con `≤`/`≥`. Se aceptan enteros, decimales (`2.5` o `2,5`) y fracciones (`7/3`).
     Las igualdades se rechazan con aviso (Gran M / dos fases quedan fuera del temario).
   - **Matriz directa**: pega o sube la tabla Símplex (CSV, JSON o texto separado por espacios) con
     el renglón z en la primera fila y `b` en la última columna; la cabecera con nombres es opcional.
     Se detectan las columnas de la identidad y se avisa si la matriz no es válida.
2. Se muestran el **problema original** y su **forma estándar** (con las notas de cómo se ha
   obtenido: holguras, superávit, cambio de signo en `min`, filas `≥` multiplicadas por −1).
3. Recorre las iteraciones con el **stepper**: `⏮ Reiniciar`, `← Anterior`, `Siguiente →`, `▶ Play`
   (una iteración cada 1,5 s), `Ir a paso k`, barra de progreso y teclado (`←`, `→`, `Inicio`).
4. En cada iteración:
   - **Tabla Símplex** con renglón z, columna pivote (`↓ entra`), fila pivote (`→ sale`), elemento
     pivote, cocientes `b_i / a_ie` con el mínimo marcado (`← mín`) y filas con `a_ie ≤ 0` tachadas.
     En el Símplex Dual los cocientes `|z_j / a_rj|` aparecen bajo cada columna.
   - Panel **«¿Qué ha pasado y por qué?»**: variable que entra y por qué, variable que sale y por qué,
     cocientes, empates y regla de Bland, cambio de convención max/min, factibilidad, óptimo, no
     acotación o infactibilidad.
   - **Operaciones aplicadas**: `F_p ← F_p / pivote` y `F_i ← F_i − a·F_p` con los factores exactos.
   - **Formulación matricial**: `B⁻¹`, `c_Bᵀ B⁻¹`, `x_B = B⁻¹ b`, valor de z y comprobación de que
     coinciden con las columnas de la base en la tabla.
5. **Gráfico 2D** (problemas de 2 variables introducidos como problema): cada restricción como recta
   con su semiplano sombreado, la región factible como polígono con sus vértices, el punto actual
   (numerado por iteración) que se mueve con el stepper, la trayectoria recorrida con flechas, la recta
   de nivel `c·x = z` (desplazable con un deslizador) y el vector gradiente. Debajo se indica el
   vértice actual, su z y la equivalencia «variables no básicas = 0 ⇔ restricciones activas». Opcional:
   mostrar las intersecciones no factibles. En el Símplex Dual los puntos fuera de la región se dibujan
   en rojo; en problemas no acotados se dibuja la dirección de crecimiento infinito de z.
6. **Gráficas de evolución** (cualquier dimensión, bajo la región factible): evolución de z por
   iteración (línea; cada punto es un botón «Ir a la iteración k»), valores de las variables básicas por
   iteración (barras agrupadas, la iteración actual resaltada), costes reducidos del renglón z en la
   iteración actual (barras; la variable que entra en rojo con «↑ entra») y holguras por restricción
   (recurso usado frente a disponible/requerido, con la holgura `s_i`/`e_i` y si la restricción está
   activa o violada). Con matriz importada no hay problema original, así que región y holguras se
   sustituyen por un aviso.
7. **Vista 3D** (problemas de 3 variables): poliedro factible exacto (vértices por intersección de tres
   planos, aristas y caras coloreadas por restricción) con la trayectoria numerada y el punto actual;
   deslizadores de giro y elevación. Si el poliedro no está acotado se recorta y las aristas del recorte
   van discontinuas.
8. Arriba a la derecha puedes alternar **fracción exacta / decimal** y **modo claro / oscuro**.
   La información nunca depende solo del color: cada resaltado lleva también texto.

## Estructura

```
src/
  solver/       # TS puro: parseo, forma estándar, Símplex primal y dual, snapshots
  geometry/     # TS puro: región 2D (rectas, vértices, polígono) y poliedro 3D (planos, vértices, aristas, caras)
  components/   # UI: entrada, tabla Símplex, gráficos, layout
  state/        # sesión (snapshots + iteración actual + método)
  examples/     # problemas precargados
  test/         # configuración de Vitest
```

## Fases

| Fase | Contenido                                                             | Estado |
| ---- | --------------------------------------------------------------------- | ------ |
| F0   | Esqueleto, CI, Vercel                                                 | ✅     |
| (a)  | Solver puro con fracciones + tests                                    | ✅     |
| (b)  | Tabla Símplex con stepper, explicaciones, panel matricial y entrada   | ✅     |
| (c)  | Gráfico 2D de región factible y trayectoria                           | ✅     |
| (d)  | Gráficos de evolución (z, básicas, costes reducidos, holguras, 3D)    | ✅     |
| (e)  | Símplex Dual, modo automático y problema dual                         | ⬜     |
| (f)  | Casos especiales (óptimo, no acotado, infactible, degeneración, alt.) | ⬜     |
| (g)  | Extras (sensibilidad, quiz, exportación, Gran M)                      | ⬜     |

## Despliegue en Vercel

El proyecto es un build estático: importa el repositorio en Vercel, detecta Vite automáticamente
y usa `vercel.json` (build `npm run build`, salida `dist/`).

## Licencia

MIT
