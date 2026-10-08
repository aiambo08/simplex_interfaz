import { expect } from 'vitest'
import { frac, type Frac } from '../fraction'
import { invertir, matrizPorVector, producto } from '../linalg'
import { parseProblem, type ProblemInput } from '../parseProblem'
import { runAll } from '../runAll'
import type { OpcionesRun, RunResult, Snapshot, StandardForm } from '../types'

export function resolver(input: ProblemInput, opts: OpcionesRun = {}): RunResult {
  return runAll(parseProblem(input), opts)
}

export const F = (s: string | number): Frac => frac(s)

export function esperarFracs(
  obtenidas: readonly Frac[],
  esperadas: readonly (string | number)[],
): void {
  expect(obtenidas.map((v) => v.toFraction())).toEqual(esperadas.map((v) => F(v).toFraction()))
}

/** Invariantes que debe cumplir cualquier snapshot respecto a la forma estándar. */
export function comprobarInvariantes(r: RunResult): void {
  const sf = r.standard
  for (const s of r.snapshots) {
    expect(Object.isFrozen(s)).toBe(true)
    expect(Object.isFrozen(s.tableau)).toBe(true)
    expect(s.comprobacion.BinvCoincide).toBe(true)
    expect(s.comprobacion.cBBinvCoincide).toBe(true)
    // columnas básicas = identidad
    s.basis.forEach((col, i) => {
      expect(s.tableau[0]![col]!.equals(0)).toBe(true)
      for (let f = 1; f < s.tableau.length; f++) {
        expect(s.tableau[f]![col]!.equals(f === i + 1 ? 1 : 0)).toBe(true)
      }
    })
    if (sf) {
      // A x = b en la forma estándar
      sf.A.forEach((fila, i) => {
        expect(producto(fila, s.x).equals(sf.b[i]!)).toBe(true)
      })
      // z = c·x (convención interna max)
      const zInterno = producto(sf.c, s.x)
      expect(s.z.equals(s.convencionZ === 'max' ? zInterno : zInterno.neg())).toBe(true)
      // zOriginal
      const zOrig = sf.signoZ === 1 ? zInterno : zInterno.neg()
      expect(s.zOriginal.equals(zOrig)).toBe(true)
    }
  }
}

export function ultimo(r: RunResult): Snapshot {
  return r.snapshots[r.snapshots.length - 1]!
}

/** Óptimo por enumeración exacta de todas las bases de la forma estándar (max interno). */
export function optimoFuerzaBruta(sf: StandardForm): { z: Frac | null; factible: boolean } {
  const n = sf.c.length
  const m = sf.m
  let mejor: Frac | null = null
  let factible = false
  const combinar = (inicio: number, elegidas: number[]): void => {
    if (elegidas.length === m) {
      const B = sf.A.map((fila) => elegidas.map((j) => fila[j]!))
      const Binv = invertir(B)
      if (!Binv) return
      const xB = matrizPorVector(Binv, sf.b)
      if (xB.some((v) => v.compare(0) < 0)) return
      factible = true
      const cB = elegidas.map((j) => sf.c[j]!)
      const z = producto(cB, xB)
      if (mejor === null || z.compare(mejor) > 0) mejor = z
      return
    }
    for (let j = inicio; j < n; j++) combinar(j + 1, [...elegidas, j])
  }
  combinar(0, [])
  return { z: mejor, factible }
}

/** PRNG determinista (mulberry32). */
export function rng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
