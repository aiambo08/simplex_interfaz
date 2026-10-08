import Fraction from 'fraction.js'
import { SolverError } from './errors'

/** Número racional exacto (fraction.js). Toda la aritmética del solver usa este tipo. */
export type Frac = Fraction

type FractionInput = ConstructorParameters<typeof Fraction>[0]

export type FracInput = number | string | bigint | Frac

export function frac(n: FracInput, d?: number | bigint): Frac {
  if (d !== undefined) {
    return new Fraction(n as number | bigint, d)
  }
  return new Fraction(n as FractionInput)
}

export const ZERO: Frac = frac(0)
export const ONE: Frac = frac(1)

const PATRON_NUMERO = /^[+-]?(\d+(\.\d+)?|\.\d+)(\/[+-]?(\d+(\.\d+)?|\.\d+))?$/

/**
 * Convierte texto a fracción. Acepta enteros ("3"), decimales ("0.5", "1,5")
 * y fracciones ("7/3", "-1/2"). Lanza SolverError con mensaje claro si no es válido.
 */
export function parseFrac(texto: string): Frac {
  const limpio = texto.trim().replace(/\s+/g, '').replace(',', '.')
  if (limpio === '') {
    throw new SolverError('Falta un número (campo vacío).')
  }
  if (!PATRON_NUMERO.test(limpio)) {
    throw new SolverError(
      `"${texto.trim()}" no es un número válido. Usa enteros, decimales o fracciones como 7/3.`,
    )
  }
  try {
    return new Fraction(limpio)
  } catch {
    throw new SolverError(`"${texto.trim()}" no es un número válido (¿división por cero?).`)
  }
}

export type ModoFormato = 'fraccion' | 'decimal'

/** Formatea una fracción como "7/3" o como decimal con un número máximo de decimales. */
export function formatFrac(f: Frac, modo: ModoFormato = 'fraccion', decimales = 3): string {
  if (modo === 'decimal') {
    const v = f.valueOf()
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(decimales).replace(/\.?0+$/, '')
  }
  return f.toFraction()
}

export const isZero = (f: Frac): boolean => f.equals(0)
export const isPos = (f: Frac): boolean => f.compare(0) > 0
export const isNeg = (f: Frac): boolean => f.compare(0) < 0
export const toNumber = (f: Frac): number => f.valueOf()

export function fracsIguales(a: readonly Frac[], b: readonly Frac[]): boolean {
  return a.length === b.length && a.every((v, i) => v.equals(b[i]!))
}

export function matricesIguales(A: readonly Frac[][], B: readonly Frac[][]): boolean {
  return A.length === B.length && A.every((fila, i) => fracsIguales(fila, B[i]!))
}
