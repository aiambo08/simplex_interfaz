import { describe, expect, it } from 'vitest'
import type { ProblemInput } from '../parseProblem'
import type { Relacion } from '../types'
import { comprobarInvariantes, optimoFuerzaBruta, resolver, rng } from './helpers'

function problemaAleatorio(rand: () => number, conDual: boolean): ProblemInput {
  const n = 2 + Math.floor(rand() * 2) // 2-3 variables
  const m = 2 + Math.floor(rand() * 2) // 2-3 restricciones
  const entero = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const restricciones = Array.from({ length: m }, () => {
    const rel: Relacion = conDual && rand() < 0.4 ? '>=' : '<='
    let coef: string[]
    do {
      coef = Array.from({ length: n }, () => String(entero(rel === '>=' ? 0 : -2, 5)))
    } while (coef.every((v) => v === '0'))
    return { coef, rel, b: String(entero(rel === '>=' ? 1 : 0, 12)) }
  })
  // Restricción acotadora para evitar problemas no acotados
  restricciones.push({
    coef: Array.from({ length: n }, () => '1'),
    rel: '<=',
    b: String(entero(5, 20)),
  })
  return {
    sentido: rand() < 0.5 ? 'max' : 'min',
    c: Array.from({ length: n }, () => String(entero(-4, 6))),
    restricciones,
  }
}

describe('problemas aleatorios vs. enumeración exacta de vértices', () => {
  it('solo <= (Símplex estándar), 150 casos, Dantzig y Bland', () => {
    const rand = rng(2026)
    for (let k = 0; k < 150; k++) {
      const input = problemaAleatorio(rand, false)
      for (const reglaEntrada of ['dantzig', 'bland'] as const) {
        const r = resolver(input, { reglaEntrada })
        expect(r.estadoFinal, JSON.stringify(input)).toBe('optimo')
        const bruto = optimoFuerzaBruta(r.standard!)
        expect(bruto.z, JSON.stringify(input)).not.toBeNull()
        const zInterno =
          r.standard!.signoZ === 1 ? r.solucion!.zOriginal : r.solucion!.zOriginal.neg()
        expect(zInterno.toFraction(), JSON.stringify(input)).toBe(bruto.z!.toFraction())
        comprobarInvariantes(r)
      }
    }
  })

  it('con restricciones >= (Símplex Dual / automático), 150 casos', () => {
    const rand = rng(7)
    let dual = 0
    let infactibles = 0
    for (let k = 0; k < 150; k++) {
      const input = problemaAleatorio(rand, true)
      const r = resolver(input)
      const bruto = optimoFuerzaBruta(r.standard!)
      if (!bruto.factible) {
        infactibles++
        expect(r.estadoFinal, JSON.stringify(input)).toBe('infactible')
      } else {
        expect(r.estadoFinal, JSON.stringify(input)).toBe('optimo')
        const zInterno =
          r.standard!.signoZ === 1 ? r.solucion!.zOriginal : r.solucion!.zOriginal.neg()
        expect(zInterno.toFraction(), JSON.stringify(input)).toBe(bruto.z!.toFraction())
      }
      if (r.metodosUsados.includes('dual')) dual++
      comprobarInvariantes(r)
    }
    expect(dual).toBeGreaterThan(20)
    expect(infactibles).toBeGreaterThan(0)
  })
})
