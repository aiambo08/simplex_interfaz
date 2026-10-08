import { describe, expect, it } from 'vitest'
import { buildInitialTableau } from '../buildInitialTableau'
import { SolverError } from '../errors'
import { parseProblem } from '../parseProblem'
import { toStandardForm } from '../toStandardForm'
import { esperarFracs } from './helpers'

describe('toStandardForm', () => {
  it('añade holguras a las restricciones <=', () => {
    const sf = toStandardForm(
      parseProblem({
        sentido: 'max',
        c: ['3', '5'],
        restricciones: [
          { coef: ['1', '0'], rel: '<=', b: '4' },
          { coef: ['0', '2'], rel: '<=', b: '12' },
        ],
      }),
    )
    expect(sf.varNames).toEqual(['x1', 'x2', 's1', 's2'])
    expect(sf.tiposVar).toEqual(['decision', 'decision', 'holgura', 'holgura'])
    esperarFracs(sf.A[0]!, [1, 0, 1, 0])
    esperarFracs(sf.A[1]!, [0, 2, 0, 1])
    esperarFracs(sf.b, [4, 12])
    expect(sf.signoZ).toBe(1)
    expect(sf.baseInicial).toEqual([2, 3])
  })

  it('convierte min a max(-z) y multiplica >= por -1', () => {
    const sf = toStandardForm(
      parseProblem({
        sentido: 'min',
        c: ['3', '2'],
        restricciones: [
          { coef: ['1', '1'], rel: '>=', b: '4' },
          { coef: ['1', '3'], rel: '>=', b: '6' },
        ],
      }),
    )
    expect(sf.signoZ).toBe(-1)
    esperarFracs(sf.c, [-3, -2, 0, 0])
    esperarFracs(sf.A[0]!, [-1, -1, 1, 0])
    esperarFracs(sf.b, [-4, -6])
    expect(sf.filasMultiplicadas).toEqual([true, true])
    expect(sf.tiposVar.slice(2)).toEqual(['superavit', 'superavit'])
    expect(sf.notas.join(' ')).toMatch(/−1|-1/)
  })

  it('rechaza igualdades con un mensaje claro', () => {
    expect(() =>
      toStandardForm(
        parseProblem({
          sentido: 'max',
          c: ['1'],
          restricciones: [{ coef: ['1'], rel: '=', b: '1' }],
        }),
      ),
    ).toThrow(/Gran M|dos fases/)
    expect(() =>
      toStandardForm(
        parseProblem({
          sentido: 'max',
          c: ['1'],
          restricciones: [{ coef: ['1'], rel: '=', b: '1' }],
        }),
      ),
    ).toThrow(SolverError)
  })
})

describe('buildInitialTableau', () => {
  it('coloca -c en el renglón z y b en la última columna', () => {
    const sf = toStandardForm(
      parseProblem({
        sentido: 'max',
        c: ['3', '5'],
        restricciones: [{ coef: ['1', '2'], rel: '<=', b: '4' }],
      }),
    )
    const t = buildInitialTableau(sf)
    esperarFracs(t.tableau[0]!, [-3, -5, 0, 0])
    esperarFracs(t.tableau[1]!, [1, 2, 1, 4])
    expect(t.basis).toEqual([2])
    expect(t.nDecision).toBe(2)
  })
})
