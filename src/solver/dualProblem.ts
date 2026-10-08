import type { Problem, Relacion, SignoVariable } from './types'

/**
 * Problema dual de un problema de PL general.
 * Primal max: restricción ≤ → y ≥ 0, ≥ → y ≤ 0, = → y libre; variable ≥ 0 → restricción dual ≥ c_j,
 * ≤ 0 → ≤ c_j, libre → = c_j. Para primal min se intercambian los papeles.
 */
export function problemaDual(p: Problem, prefijo = 'y'): Problem {
  const m = p.restricciones.length
  const n = p.c.length
  const signos = p.signosVars ?? Array.from({ length: n }, (): SignoVariable => '>=0')
  const esMax = p.sentido === 'max'

  const signosDual: SignoVariable[] = p.restricciones.map((r) => {
    if (r.rel === '=') return 'libre'
    if (esMax) return r.rel === '<=' ? '>=0' : '<=0'
    return r.rel === '>=' ? '>=0' : '<=0'
  })

  const restricciones = Array.from({ length: n }, (_, j) => {
    const coef = p.restricciones.map((r) => r.coef[j]!)
    const signo = signos[j]!
    let rel: Relacion
    if (signo === 'libre') rel = '='
    else if (esMax) rel = signo === '>=0' ? '>=' : '<='
    else rel = signo === '>=0' ? '<=' : '>='
    return { coef, rel, b: p.c[j]! }
  })

  return {
    sentido: esMax ? 'min' : 'max',
    c: p.restricciones.map((r) => r.b),
    restricciones,
    nombresVars: Array.from({ length: m }, (_, i) => `${prefijo}${i + 1}`),
    signosVars: signosDual,
  }
}
