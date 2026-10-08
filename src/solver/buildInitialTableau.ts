import { ZERO, type Frac } from './fraction'
import type { InitialTableau, StandardForm } from './types'

/**
 * Tabla Símplex inicial con la notación de los apuntes:
 * fila 0 = renglón z (z − c·x = 0, es decir, coeficientes −c_j y 0 en el término independiente),
 * filas 1..m = restricciones, última columna = términos independientes.
 */
export function buildInitialTableau(sf: StandardForm): InitialTableau {
  const filaZ: Frac[] = [...sf.c.map((v) => v.neg()), ZERO]
  const filas = sf.A.map((fila, i) => [...fila, sf.b[i]!])
  return {
    tableau: [filaZ, ...filas],
    varNames: [...sf.varNames],
    basis: [...sf.baseInicial],
    nDecision: sf.nDecision,
    signoZ: sf.signoZ,
    filasMultiplicadas: [...sf.filasMultiplicadas],
    c: [...sf.c],
  }
}
