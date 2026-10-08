import { isNeg, type Frac } from './fraction'
import { aplicarPivote } from './simplexStep'
import { numColumnasVars, numFilas } from './tableau'
import type { Cociente, OperacionesPivote, Pivote } from './types'

export type EleccionDual =
  | { estado: 'continua'; pivote: Pivote }
  | { estado: 'factible' }
  | { estado: 'infactible'; filaInfactible: number; candidatos: number[] }

/**
 * Criterio del Símplex Dual (convención min: el renglón z ya es óptimo, ningún coeficiente
 * positivo). Sale la fila con b_i más negativo; entra la columna con a_rj < 0 que minimiza
 * |z_j / a_rj|. Empates: en la salida, la variable básica de menor índice (Bland); en la
 * entrada, la columna de menor índice.
 */
export function elegirPivoteDual(
  tableau: readonly Frac[][],
  basis: readonly number[],
): EleccionDual {
  const nVars = numColumnasVars(tableau)
  const m = numFilas(tableau)
  const filaZ = tableau[0]!

  const candidatos: number[] = []
  for (let i = 1; i <= m; i++) {
    if (isNeg(tableau[i]![nVars]!)) candidatos.push(i)
  }
  if (candidatos.length === 0) return { estado: 'factible' }

  let fila = candidatos[0]!
  for (const i of candidatos) {
    const cmp = tableau[i]![nVars]!.compare(tableau[fila]![nVars]!)
    if (cmp < 0 || (cmp === 0 && basis[i - 1]! < basis[fila - 1]!)) fila = i
  }

  const cocientes: Cociente[] = []
  let minimo: Frac | null = null
  for (let j = 0; j < nVars; j++) {
    const a = tableau[fila]![j]!
    if (isNeg(a)) {
      const valor = filaZ[j]!.abs().div(a.abs())
      cocientes.push({ indice: j, valor, elegible: true, minimo: false })
      if (minimo === null || valor.compare(minimo) < 0) minimo = valor
    } else {
      cocientes.push({ indice: j, valor: null, elegible: false, minimo: false })
    }
  }
  if (minimo === null) {
    return { estado: 'infactible', filaInfactible: fila, candidatos }
  }
  const empates: number[] = []
  for (const c of cocientes) {
    if (c.elegible && c.valor!.equals(minimo)) {
      c.minimo = true
      empates.push(c.indice)
    }
  }
  const entra = empates[0]!

  return {
    estado: 'continua',
    pivote: {
      metodo: 'dual',
      entra,
      sale: basis[fila - 1]!,
      fila,
      col: entra,
      cocientes,
      empates: empates.length > 1 ? empates : [],
      desempatePorBland: empates.length > 1,
      candidatos,
    },
  }
}

/** Un paso completo del Símplex Dual. */
export function dualSimplexStep(
  tableau: readonly Frac[][],
  basis: readonly number[],
):
  | {
      estado: 'continua'
      tableau: Frac[][]
      basis: number[]
      pivote: Pivote
      operaciones: OperacionesPivote
    }
  | Exclude<EleccionDual, { estado: 'continua' }> {
  const eleccion = elegirPivoteDual(tableau, basis)
  if (eleccion.estado !== 'continua') return eleccion
  return {
    estado: 'continua',
    ...aplicarPivote(tableau, basis, eleccion.pivote),
    pivote: eleccion.pivote,
  }
}
