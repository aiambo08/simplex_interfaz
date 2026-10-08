import { isNeg, isPos, isZero, type Frac } from './fraction'
import { numColumnasVars, numFilas } from './tableau'
import type { Cociente, OperacionesPivote, Pivote, ReglaEntrada } from './types'

export type EleccionPrimal =
  | { estado: 'continua'; pivote: Pivote }
  | { estado: 'optimo'; optimosAlternativosCols: number[] }
  | { estado: 'no_acotado'; colNoAcotada: number; candidatos: number[] }

/**
 * Criterio de entrada y salida del Símplex estándar (convención max):
 * entra la variable con coeficiente más negativo del renglón z (Dantzig; con Bland, la de
 * menor índice entre las negativas); sale la fila con mínimo cociente b_i / a_ie entre las
 * filas con a_ie > 0. Los empates en el cociente se resuelven con la regla de Bland
 * (sale la variable básica de menor índice).
 */
export function elegirPivotePrimal(
  tableau: readonly Frac[][],
  basis: readonly number[],
  regla: ReglaEntrada = 'dantzig',
): EleccionPrimal {
  const nVars = numColumnasVars(tableau)
  const m = numFilas(tableau)
  const filaZ = tableau[0]!
  const esBasica = new Set(basis)

  const candidatos: number[] = []
  for (let j = 0; j < nVars; j++) {
    if (!esBasica.has(j) && isNeg(filaZ[j]!)) candidatos.push(j)
  }
  if (candidatos.length === 0) {
    const optimosAlternativosCols: number[] = []
    for (let j = 0; j < nVars; j++) {
      if (!esBasica.has(j) && isZero(filaZ[j]!)) optimosAlternativosCols.push(j)
    }
    return { estado: 'optimo', optimosAlternativosCols }
  }

  let entra = candidatos[0]!
  if (regla === 'dantzig') {
    for (const j of candidatos) {
      if (filaZ[j]!.compare(filaZ[entra]!) < 0) entra = j
    }
  }

  const cocientes: Cociente[] = []
  let minimo: Frac | null = null
  for (let i = 1; i <= m; i++) {
    const a = tableau[i]![entra]!
    const b = tableau[i]![nVars]!
    if (isPos(a)) {
      const valor = b.div(a)
      cocientes.push({ indice: i, valor, elegible: true, minimo: false })
      if (minimo === null || valor.compare(minimo) < 0) minimo = valor
    } else {
      cocientes.push({ indice: i, valor: null, elegible: false, minimo: false })
    }
  }
  if (minimo === null) {
    return { estado: 'no_acotado', colNoAcotada: entra, candidatos }
  }
  const empates: number[] = []
  for (const c of cocientes) {
    if (c.elegible && c.valor!.equals(minimo)) {
      c.minimo = true
      empates.push(c.indice)
    }
  }
  let fila = empates[0]!
  for (const i of empates) {
    if (basis[i - 1]! < basis[fila - 1]!) fila = i
  }

  return {
    estado: 'continua',
    pivote: {
      metodo: 'primal',
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

/** Pivota sobre (fila, col) con operaciones elementales exactas y las devuelve para mostrarlas. */
export function pivotar(
  tableau: readonly Frac[][],
  fila: number,
  col: number,
): { tableau: Frac[][]; operaciones: OperacionesPivote } {
  const divisor = tableau[fila]![col]!
  const filaPivote = tableau[fila]!.map((v) => v.div(divisor))
  const eliminaciones: OperacionesPivote['eliminaciones'] = []
  const nuevo = tableau.map((f, i) => {
    if (i === fila) return filaPivote
    const factor = f[col]!
    if (isZero(factor)) return [...f]
    eliminaciones.push({ fila: i, factor, filaPivote: fila })
    return f.map((v, j) => v.sub(factor.mul(filaPivote[j]!)))
  })
  return { tableau: nuevo, operaciones: { fila, col, divisor, eliminaciones } }
}

export function aplicarPivote(
  tableau: readonly Frac[][],
  basis: readonly number[],
  pivote: Pivote,
): { tableau: Frac[][]; basis: number[]; operaciones: OperacionesPivote } {
  const { tableau: nuevo, operaciones } = pivotar(tableau, pivote.fila, pivote.col)
  const nuevaBase = [...basis]
  nuevaBase[pivote.fila - 1] = pivote.entra
  return { tableau: nuevo, basis: nuevaBase, operaciones }
}

/** Un paso completo del Símplex estándar. */
export function simplexStep(
  tableau: readonly Frac[][],
  basis: readonly number[],
  regla: ReglaEntrada = 'dantzig',
):
  | {
      estado: 'continua'
      tableau: Frac[][]
      basis: number[]
      pivote: Pivote
      operaciones: OperacionesPivote
    }
  | Exclude<EleccionPrimal, { estado: 'continua' }> {
  const eleccion = elegirPivotePrimal(tableau, basis, regla)
  if (eleccion.estado !== 'continua') return eleccion
  return {
    estado: 'continua',
    ...aplicarPivote(tableau, basis, eleccion.pivote),
    pivote: eleccion.pivote,
  }
}
