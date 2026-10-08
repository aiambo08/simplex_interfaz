# `src/solver/` — solver puro del Símplex

TypeScript sin React, con aritmética exacta (`fraction.js`). Toda la UI consume únicamente el
array de `Snapshot` que devuelve `runAll`.

## Flujo

```
ProblemInput ──parseProblem──▶ Problem ──toStandardForm──▶ StandardForm ──buildInitialTableau──▶ InitialTableau
texto CSV/JSON ──importarMatriz──────────────────────────────────────────────────────────────▶ InitialTableau
InitialTableau ──runAll──▶ RunResult { snapshots: Snapshot[], estadoFinal, solucion, metodosUsados }
```

| Archivo                  | Responsabilidad                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fraction.ts`            | Tipo `Frac`, `parseFrac` (acepta `3`, `-2.5`, `0,75`, `7/3`), `formatFrac` (fracción o decimal).                                                                                                                              |
| `types.ts`               | `Problem`, `StandardForm`, `InitialTableau`, `Snapshot`, `RunResult`, `Pivote`, `Flags`, …                                                                                                                                    |
| `parseProblem.ts`        | Formulario → `Problem`. Acumula todos los errores en español (`SolverError.detalles`).                                                                                                                                        |
| `toStandardForm.ts`      | `min` → `max(−z)`; `<=` añade holgura `s_i`; `>=` multiplica la fila por −1 y añade superávit `e_i`. `=` se rechaza (Gran M / dos fases fuera del temario).                                                                   |
| `buildInitialTableau.ts` | Renglón z en la fila 0 con `−c_j`, término independiente en la última columna.                                                                                                                                                |
| `matrixImport.ts`        | CSV / JSON / texto → `InitialTableau`. Detecta las columnas de la identidad y avisa de `b < 0`.                                                                                                                               |
| `linalg.ts`              | Producto, inversa de Gauss-Jordan exacta, identidad.                                                                                                                                                                          |
| `tableau.ts`             | `analizarTableau`: `x`, `z`, `B⁻¹`, `c_Bᵀ B⁻¹`, comprobación contra las columnas de holgura, factibilidad primal/dual, degeneración, costes reducidos nulos.                                                                  |
| `simplexStep.ts`         | Símplex estándar (convención **max**): entra el coeficiente más negativo del renglón z (Dantzig) o el de menor índice (Bland); sale el mínimo `b_i / a_ie` con `a_ie > 0`; empates → menor índice de variable básica (Bland). |
| `dualSimplexStep.ts`     | Símplex Dual (convención **min**): sale el `b_i` más negativo; entra el mínimo `                                                                                                                                              | z_j / a_rj | `con`a_rj < 0`; sin candidatas → infactible. |
| `runAll.ts`              | Orquesta métodos, inversiones de z, snapshots inmutables (congelados) y precios sombra.                                                                                                                                       |
| `explain.ts`             | Textos "¿Qué ha pasado y por qué?" en español para cada snapshot.                                                                                                                                                             |
| `dualProblem.ts`         | Problema dual de un problema general (signos de variables y restricciones).                                                                                                                                                   |

## Convenciones

- **Snapshot `k`** = tabla tras `k` pivotes (`pivotesRealizados`) **más** la decisión tomada desde ella
  (`pivote`, `explicacion`). `operaciones` describe las operaciones de fila que produjeron esa tabla.
- `convencionZ` indica cómo leer el renglón z: `'max'` (óptimo ⇔ ningún coeficiente negativo) o
  `'min'` (óptimo ⇔ ningún coeficiente positivo). Un snapshot con `cambioConvencion` muestra el renglón z
  multiplicado por −1 respecto al anterior.
- `z` es el valor que aparece en la tabla (en la convención actual); `zOriginal` es el valor de la función
  objetivo del problema tal y como lo escribió el usuario.
- `preciosSombra[i] = ∂z_original / ∂b_i` para la restricción original `i`, leídos del renglón z en la
  columna de la holgura/superávit `i` con los ajustes de signo por `min`, por fila multiplicada por −1 y
  por convención.

## Modo automático (`metodo: 'auto'`, por defecto)

1. Si la base es factible (`b ≥ 0`) se usa el Símplex estándar en convención `max`.
2. Si hay `b_i < 0`, se invierte el renglón z (snapshot "Inversión de la función objetivo"), se aplica el
   Símplex Dual en convención `min` hasta que `b ≥ 0` (o se detecta infactibilidad).
3. Si al terminar el Dual el renglón z no es óptimo, se invierte de nuevo y se continúa con el estándar.

Supuesto adoptado (según los apuntes del usuario): el Dual se aplica aunque el renglón z no sea óptimo,
usando cocientes en valor absoluto; por eso existe el paso 3. `metodo: 'primal'` se bloquea con aviso si la
base inicial no es factible.

## Tests (`__tests__/`)

`npm run test:coverage`. Casos: óptimo conocido (Wyndor, z* = 36, precios sombra (0, 3/2, 1)),
degenerado (empate + Bland), no acotado, infactible, Símplex Dual (min con `>=`), Dual seguido de estándar,
óptimos alternativos, problema dual (dualidad fuerte), importación de matrices, y 300 problemas aleatorios
comparados con la enumeración exacta de todas las bases.
