import { SolverError } from './errors'
import { formatFrac, ONE, ZERO, type Frac } from './fraction'
import type { Problem, StandardForm, TipoVariable } from './types'

export interface OpcionesEstandar {
  /** Nombre de las variables de holgura (por defecto s) y de superávit (por defecto e). */
  prefijoHolgura?: string
  prefijoSuperavit?: string
}

function describirLineal(coef: readonly Frac[], nombres: readonly string[]): string {
  const partes: string[] = []
  coef.forEach((v, j) => {
    if (v.equals(0)) return
    const abs = formatFrac(v.abs())
    const coefTxt = abs === '1' ? '' : abs
    const signo = v.compare(0) < 0 ? '−' : '+'
    const termino = `${coefTxt}${nombres[j]}`
    partes.push(
      partes.length === 0 ? `${signo === '−' ? '−' : ''}${termino}` : `${signo} ${termino}`,
    )
  })
  return partes.length === 0 ? '0' : partes.join(' ')
}

/**
 * Pasa el problema a forma estándar de maximización con holguras (≤) y superávit (≥).
 * Las restricciones ≥ se multiplican por −1 para que su variable de superávit entre en la
 * base inicial con coeficiente +1 (el b queda negativo y se resuelve con el Símplex Dual).
 * Las igualdades requieren variables artificiales (Gran M / dos fases, fuera del temario):
 * se rechazan con un SolverError.
 */
export function toStandardForm(problem: Problem, opciones: OpcionesEstandar = {}): StandardForm {
  const { prefijoHolgura = 's', prefijoSuperavit = 'e' } = opciones
  const n = problem.c.length
  const m = problem.restricciones.length
  const notas: string[] = []

  const igualdades = problem.restricciones
    .map((r, i) => (r.rel === '=' ? i + 1 : -1))
    .filter((i) => i > 0)
  if (igualdades.length > 0) {
    throw new SolverError(
      `Las restricciones de igualdad (${igualdades.map((i) => `nº ${i}`).join(', ')}) necesitan variables artificiales (Gran M o dos fases), que están fuera del temario y aún no están implementadas. Sustituye cada igualdad por el par ≤ y ≥ o cambia la restricción.`,
    )
  }

  const signoZ: 1 | -1 = problem.sentido === 'min' ? -1 : 1
  const cDecision = problem.c.map((v) => (signoZ === -1 ? v.neg() : v))
  if (signoZ === -1) {
    notas.push(
      `Minimizar z = ${describirLineal(problem.c, problem.nombresVars)} equivale a maximizar z' = −z = ${describirLineal(cDecision, problem.nombresVars)}. Al final, z_original = −z'.`,
    )
  } else {
    notas.push(`Se maximiza z = ${describirLineal(problem.c, problem.nombresVars)}.`)
  }

  const varNames = [...problem.nombresVars]
  const tiposVar: TipoVariable[] = Array.from({ length: n }, () => 'decision')
  const filasMultiplicadas: boolean[] = []
  const baseInicial: number[] = []
  const A: Frac[][] = []
  const b: Frac[] = []

  let numHolgura = 0
  let numSuperavit = 0
  problem.restricciones.forEach((r, i) => {
    const colExtra = n + i
    let fila = [...r.coef]
    let bi = r.b
    if (r.rel === '<=') {
      numHolgura++
      varNames.push(`${prefijoHolgura}${numHolgura}`)
      tiposVar.push('holgura')
      filasMultiplicadas.push(false)
      notas.push(
        `Restricción ${i + 1}: ${describirLineal(r.coef, problem.nombresVars)} ≤ ${formatFrac(r.b)} → se suma la holgura ${varNames[colExtra]} ≥ 0: ${describirLineal(r.coef, problem.nombresVars)} + ${varNames[colExtra]} = ${formatFrac(r.b)}.`,
      )
    } else {
      numSuperavit++
      varNames.push(`${prefijoSuperavit}${numSuperavit}`)
      tiposVar.push('superavit')
      filasMultiplicadas.push(true)
      fila = fila.map((v) => v.neg())
      bi = bi.neg()
      notas.push(
        `Restricción ${i + 1}: ${describirLineal(r.coef, problem.nombresVars)} ≥ ${formatFrac(r.b)} → se resta el superávit ${varNames[colExtra]} ≥ 0 y se multiplica por −1 para que ${varNames[colExtra]} sea básica con coeficiente +1: ${describirLineal(fila, problem.nombresVars)} + ${varNames[colExtra]} = ${formatFrac(bi)}${bi.compare(0) < 0 ? ' (b negativo: hará falta el Símplex Dual)' : ''}.`,
      )
    }
    const filaCompleta = [...fila, ...Array.from({ length: m }, (_, k) => (k === i ? ONE : ZERO))]
    A.push(filaCompleta)
    b.push(bi)
    baseInicial.push(colExtra)
  })

  const c = [...cDecision, ...Array.from({ length: m }, () => ZERO)]

  return {
    original: problem,
    c,
    A,
    b,
    varNames,
    tiposVar,
    nDecision: n,
    m,
    signoZ,
    filasMultiplicadas,
    baseInicial,
    notas,
  }
}
