import { SolverError } from './errors'
import { fracsIguales, isNeg, isPos, isZero, matricesIguales, ZERO, type Frac } from './fraction'
import { invertir, vectorPorMatriz } from './linalg'
import type { Comprobacion, Convencion, InitialTableau } from './types'

export interface Analisis {
  xB: Frac[]
  x: Frac[]
  z: Frac
  zOriginal: Frac
  cB: Frac[]
  Binv: Frac[][]
  cBBinv: Frac[]
  comprobacion: Comprobacion
  factible: boolean
  dualFactible: boolean
  filasDegeneradas: number[]
  /** Columnas no básicas con coeficiente 0 en el renglón z. */
  colsCosteCero: number[]
}

export const numColumnasVars = (tableau: readonly Frac[][]): number => tableau[0]!.length - 1
export const numFilas = (tableau: readonly Frac[][]): number => tableau.length - 1

/** Costes de cada columna en la convención dada (max: c; min: −c). */
export function costesEnConvencion(c: readonly Frac[], conv: Convencion): Frac[] {
  return conv === 'max' ? [...c] : c.map((v) => v.neg())
}

/** Invierte el renglón z (cambia la convención max ↔ min). */
export function invertirRenglonZ(tableau: readonly Frac[][]): Frac[][] {
  return tableau.map((fila, i) => (i === 0 ? fila.map((v) => v.neg()) : [...fila]))
}

/**
 * Calcula todo lo que la UI necesita de una tabla: solución básica, z, B⁻¹, c_Bᵀ B⁻¹,
 * factibilidad primal (b ≥ 0) y dual (renglón z óptimo en la convención actual).
 */
export function analizarTableau(
  tableau: readonly Frac[][],
  basis: readonly number[],
  inicial: InitialTableau,
  conv: Convencion,
): Analisis {
  const m = numFilas(tableau)
  const nVars = numColumnasVars(tableau)
  const filaZ = tableau[0]!
  const colB = nVars

  const xB = Array.from({ length: m }, (_, i) => tableau[i + 1]![colB]!)
  const x: Frac[] = Array.from({ length: nVars }, () => ZERO)
  basis.forEach((col, i) => {
    x[col] = xB[i]!
  })

  const z = filaZ[colB]!
  const g = conv === 'max' ? z : z.neg()
  const zOriginal = inicial.signoZ === 1 ? g : g.neg()

  const B = Array.from({ length: m }, (_, i) => basis.map((col) => inicial.tableau[i + 1]![col]!))
  const Binv = invertir(B)
  if (!Binv) {
    throw new SolverError('La base actual es singular: las columnas básicas no son independientes.')
  }
  const cConv = costesEnConvencion(inicial.c, conv)
  const cB = basis.map((col) => cConv[col]!)
  const cBBinv = vectorPorMatriz(cB, Binv)

  const columnasBase = [...inicial.basis]
  const subTabla = Array.from({ length: m }, (_, i) =>
    columnasBase.map((col) => tableau[i + 1]![col]!),
  )
  const zEnBase = columnasBase.map((col) => filaZ[col]!.add(cConv[col]!))
  const comprobacion: Comprobacion = {
    columnasBase,
    BinvCoincide: matricesIguales(Binv, subTabla),
    cBBinvCoincide: fracsIguales(cBBinv, zEnBase),
  }

  const factible = xB.every((v) => !isNeg(v))
  const esBasica = new Set(basis)
  const noBasicas = Array.from({ length: nVars }, (_, j) => j).filter((j) => !esBasica.has(j))
  const dualFactible = noBasicas.every((j) =>
    conv === 'max' ? !isNeg(filaZ[j]!) : !isPos(filaZ[j]!),
  )
  const filasDegeneradas = xB.map((v, i) => (isZero(v) ? i + 1 : -1)).filter((i) => i > 0)
  const colsCosteCero = noBasicas.filter((j) => isZero(filaZ[j]!))

  return {
    xB,
    x,
    z,
    zOriginal,
    cB,
    Binv,
    cBBinv,
    comprobacion,
    factible,
    dualFactible,
    filasDegeneradas,
    colsCosteCero,
  }
}
