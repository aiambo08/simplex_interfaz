import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EJEMPLOS } from '../examples/ejemplos'
import { parseProblem } from '../solver'
import { INTERVALO_PLAY_MS, useSimplexSession } from './useSimplexSession'

const ejemplo = () => parseProblem(EJEMPLOS[0]!.input)

describe('useSimplexSession', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('carga un problema y navega sin salirse del rango', () => {
    const { result } = renderHook(() => useSimplexSession())
    expect(result.current.snapshot).toBeNull()
    act(() => result.current.cargarProblema(ejemplo()))
    expect(result.current.total).toBeGreaterThan(1)
    expect(result.current.k).toBe(0)
    act(() => result.current.anterior())
    expect(result.current.k).toBe(0)
    act(() => result.current.irA(999))
    expect(result.current.k).toBe(result.current.total - 1)
    act(() => result.current.siguiente())
    expect(result.current.k).toBe(result.current.total - 1)
    act(() => result.current.reiniciar())
    expect(result.current.k).toBe(0)
  })

  it('los snapshots no se recalculan al navegar (misma referencia)', () => {
    const { result } = renderHook(() => useSimplexSession())
    act(() => result.current.cargarProblema(ejemplo()))
    const s0 = result.current.snapshot
    act(() => result.current.siguiente())
    act(() => result.current.anterior())
    expect(result.current.snapshot).toBe(s0)
    expect(result.current.anteriorSnapshot).toBeNull()
  })

  it('play avanza automáticamente y se detiene al final', () => {
    const { result } = renderHook(() => useSimplexSession())
    act(() => result.current.cargarProblema(ejemplo()))
    act(() => result.current.setReproduciendo(true))
    expect(result.current.reproduciendo).toBe(true)
    const total = result.current.total
    act(() => vi.advanceTimersByTime(INTERVALO_PLAY_MS * (total + 2)))
    expect(result.current.k).toBe(total - 1)
    expect(result.current.reproduciendo).toBe(false)
    act(() => result.current.setReproduciendo(true))
    expect(result.current.k).toBe(0)
  })

  it('guarda el error de un problema con igualdades', () => {
    const { result } = renderHook(() => useSimplexSession())
    act(() =>
      result.current.cargarProblema(
        parseProblem({
          sentido: 'max',
          c: ['1'],
          restricciones: [{ coef: ['1'], rel: '=', b: '2' }],
        }),
      ),
    )
    expect(result.current.error?.mensaje).toMatch(/igualdad|Gran M/i)
    expect(result.current.resultado).toBeNull()
  })
})
