import { describe, expect, it } from 'vitest'
import { frac } from '../fraction'
import { identidad, invertir, matrizPorMatriz, matrizPorVector, vectorPorMatriz } from '../linalg'
import { esperarFracs } from './helpers'

const M = (rows: number[][]) => rows.map((r) => r.map((v) => frac(v)))

describe('linalg', () => {
  it('invierte una matriz 2x2 exactamente', () => {
    const A = M([
      [4, 7],
      [2, 6],
    ])
    const inv = invertir(A)!
    esperarFracs(inv.flat(), ['3/5', '-7/10', '-1/5', '2/5'])
    const prod = matrizPorMatriz(A, inv)
    expect(prod.every((f, i) => f.every((v, j) => v.equals(identidad(2)[i]![j]!)))).toBe(true)
  })
  it('devuelve null para una matriz singular', () => {
    expect(
      invertir(
        M([
          [1, 2],
          [2, 4],
        ]),
      ),
    ).toBeNull()
  })
  it('multiplica vectores y matrices', () => {
    const A = M([
      [1, 2],
      [3, 4],
    ])
    esperarFracs(matrizPorVector(A, [frac(1), frac(1)]), [3, 7])
    esperarFracs(vectorPorMatriz([frac(1), frac(1)], A), [4, 6])
  })
})
