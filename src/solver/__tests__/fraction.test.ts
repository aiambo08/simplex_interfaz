import { describe, expect, it } from 'vitest'
import { formatFrac, frac, fracsIguales, matricesIguales, parseFrac } from '../fraction'
import { SolverError } from '../errors'

describe('parseFrac', () => {
  it('acepta enteros, decimales, comas y fracciones', () => {
    expect(parseFrac('3').toFraction()).toBe('3')
    expect(parseFrac('-2.5').toFraction()).toBe('-5/2')
    expect(parseFrac('0,75').toFraction()).toBe('3/4')
    expect(parseFrac(' 7/3 ').toFraction()).toBe('7/3')
    expect(parseFrac('-1/2').toFraction()).toBe('-1/2')
  })
  it('rechaza texto no numérico y división por cero', () => {
    expect(() => parseFrac('abc')).toThrow(SolverError)
    expect(() => parseFrac('')).toThrow(SolverError)
    expect(() => parseFrac('1/0')).toThrow(SolverError)
    expect(() => parseFrac('1/2/3')).toThrow(SolverError)
  })
})

describe('formatFrac', () => {
  it('formatea como fracción o decimal', () => {
    expect(formatFrac(frac(7, 2))).toBe('7/2')
    expect(formatFrac(frac(-3))).toBe('-3')
    expect(formatFrac(frac(1, 3), 'decimal', 3)).toBe('0.333')
    expect(formatFrac(frac(2), 'decimal')).toBe('2')
  })
})

describe('comparaciones', () => {
  it('compara vectores y matrices exactamente', () => {
    expect(fracsIguales([frac(1, 2)], [frac(2, 4)])).toBe(true)
    expect(fracsIguales([frac(1)], [frac(1), frac(2)])).toBe(false)
    expect(matricesIguales([[frac(1)]], [[frac(1)]])).toBe(true)
    expect(matricesIguales([[frac(1)]], [[frac(2)]])).toBe(false)
  })
})
