import { describe, expect, it } from 'vitest'
import { SolverError } from '../errors'
import { nombresPorDefecto, parseProblem } from '../parseProblem'

describe('parseProblem', () => {
  it('convierte un formulario válido a fracciones', () => {
    const p = parseProblem({
      sentido: 'max',
      c: ['3', '5'],
      restricciones: [
        { coef: ['1', '0'], rel: '<=', b: '4' },
        { coef: ['0', '2'], rel: '<=', b: '12' },
      ],
    })
    expect(p.c.map((v) => v.toFraction())).toEqual(['3', '5'])
    expect(p.nombresVars).toEqual(['x1', 'x2'])
    expect(p.restricciones[1]!.b.toFraction()).toBe('12')
  })

  it('acumula errores en español', () => {
    const intento = () =>
      parseProblem({
        sentido: 'max',
        c: ['3', 'abc'],
        restricciones: [
          { coef: ['1'], rel: '<=', b: '4' },
          { coef: ['0', '0'], rel: '<=', b: '1' },
        ],
      })
    expect(intento).toThrow(SolverError)
    try {
      intento()
    } catch (e) {
      const err = e as SolverError
      expect(err.detalles.length).toBeGreaterThanOrEqual(3)
      expect(err.detalles.join(' ')).toMatch(/coeficiente/i)
    }
  })

  it('rechaza problemas sin restricciones o sin función objetivo', () => {
    expect(() => parseProblem({ sentido: 'max', c: [], restricciones: [] })).toThrow(SolverError)
  })

  it('rechaza nombres duplicados', () => {
    expect(() =>
      parseProblem({
        sentido: 'min',
        c: ['1', '1'],
        restricciones: [{ coef: ['1', '1'], rel: '>=', b: '1' }],
        nombresVars: ['x', 'x'],
      }),
    ).toThrow(SolverError)
  })

  it('genera nombres por defecto', () => {
    expect(nombresPorDefecto(3)).toEqual(['x1', 'x2', 'x3'])
    expect(nombresPorDefecto(2, 's')).toEqual(['s1', 's2'])
  })
})
