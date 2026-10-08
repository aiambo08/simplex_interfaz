import { describe, expect, it } from 'vitest'
import { problemaDual } from '../dualProblem'
import { parseProblem } from '../parseProblem'
import { esperarFracs, resolver } from './helpers'

describe('problemaDual', () => {
  it('traspone un max con <= en un min con >=', () => {
    const p = parseProblem({
      sentido: 'max',
      c: ['3', '5'],
      restricciones: [
        { coef: ['1', '0'], rel: '<=', b: '4' },
        { coef: ['0', '2'], rel: '<=', b: '12' },
        { coef: ['3', '2'], rel: '<=', b: '18' },
      ],
    })
    const d = problemaDual(p)
    expect(d.sentido).toBe('min')
    esperarFracs(d.c, [4, 12, 18])
    expect(d.nombresVars).toEqual(['y1', 'y2', 'y3'])
    expect(d.restricciones.map((r) => r.rel)).toEqual(['>=', '>='])
    esperarFracs(d.restricciones[0]!.coef, [1, 0, 3])
    esperarFracs(d.restricciones[1]!.coef, [0, 2, 2])
    esperarFracs(
      d.restricciones.map((r) => r.b),
      [3, 5],
    )
    expect(d.signosVars).toEqual(['>=0', '>=0', '>=0'])
  })

  it('dualidad fuerte: el dual tiene el mismo valor óptimo', () => {
    const p = parseProblem({
      sentido: 'max',
      c: ['3', '5'],
      restricciones: [
        { coef: ['1', '0'], rel: '<=', b: '4' },
        { coef: ['0', '2'], rel: '<=', b: '12' },
        { coef: ['3', '2'], rel: '<=', b: '18' },
      ],
    })
    const d = problemaDual(p)
    const rp = resolver({
      sentido: 'max',
      c: ['3', '5'],
      restricciones: [
        { coef: ['1', '0'], rel: '<=', b: '4' },
        { coef: ['0', '2'], rel: '<=', b: '12' },
        { coef: ['3', '2'], rel: '<=', b: '18' },
      ],
    })
    const rd = resolver({
      sentido: d.sentido,
      c: d.c.map((v) => v.toFraction()),
      restricciones: d.restricciones.map((r) => ({
        coef: r.coef.map((v) => v.toFraction()),
        rel: r.rel,
        b: r.b.toFraction(),
      })),
    })
    expect(rd.estadoFinal).toBe('optimo')
    expect(rd.solucion!.zOriginal.toFraction()).toBe(rp.solucion!.zOriginal.toFraction())
    // La solución del dual coincide con los precios sombra del primal
    esperarFracs(
      rd.solucion!.xDecision,
      rp.solucion!.preciosSombra.map((v) => v.toFraction()),
    )
  })

  it('min con >= y <= produce signos correctos en el dual', () => {
    const p = parseProblem({
      sentido: 'min',
      c: ['3', '2'],
      restricciones: [
        { coef: ['1', '1'], rel: '>=', b: '4' },
        { coef: ['1', '3'], rel: '<=', b: '20' },
      ],
    })
    const d = problemaDual(p)
    expect(d.sentido).toBe('max')
    expect(d.signosVars).toEqual(['>=0', '<=0'])
    expect(d.restricciones.map((r) => r.rel)).toEqual(['<=', '<='])
  })
})
