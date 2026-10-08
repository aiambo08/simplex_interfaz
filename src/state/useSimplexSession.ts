import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  runAll,
  SolverError,
  type InitialTableau,
  type OpcionesRun,
  type Problem,
  type RunResult,
  type Snapshot,
} from '../solver'

export interface ErrorEntrada {
  mensaje: string
  detalles: string[]
}

export interface EstadoSesion {
  resultado: RunResult | null
  k: number
  reproduciendo: boolean
  error: ErrorEntrada | null
  avisos: string[]
}

type Accion =
  | { tipo: 'cargar'; resultado: RunResult; avisos: string[] }
  | { tipo: 'error'; error: ErrorEntrada }
  | { tipo: 'irA'; k: number }
  | { tipo: 'siguiente' }
  | { tipo: 'anterior' }
  | { tipo: 'reiniciar' }
  | { tipo: 'play'; valor: boolean }
  | { tipo: 'limpiar' }

const INICIAL: EstadoSesion = {
  resultado: null,
  k: 0,
  reproduciendo: false,
  error: null,
  avisos: [],
}

function acotar(k: number, r: RunResult | null): number {
  if (!r) return 0
  return Math.max(0, Math.min(k, r.snapshots.length - 1))
}

function reducer(e: EstadoSesion, a: Accion): EstadoSesion {
  switch (a.tipo) {
    case 'cargar':
      return { resultado: a.resultado, k: 0, reproduciendo: false, error: null, avisos: a.avisos }
    case 'error':
      return { ...e, error: a.error, reproduciendo: false }
    case 'limpiar':
      return INICIAL
    case 'irA':
      return { ...e, k: acotar(a.k, e.resultado) }
    case 'siguiente': {
      const k = acotar(e.k + 1, e.resultado)
      const fin = e.resultado ? k === e.resultado.snapshots.length - 1 : true
      return { ...e, k, reproduciendo: fin ? false : e.reproduciendo }
    }
    case 'anterior':
      return { ...e, k: acotar(e.k - 1, e.resultado) }
    case 'reiniciar':
      return { ...e, k: 0, reproduciendo: false }
    case 'play': {
      if (!e.resultado) return e
      const alFinal = e.k === e.resultado.snapshots.length - 1
      return { ...e, k: a.valor && alFinal ? 0 : e.k, reproduciendo: a.valor }
    }
  }
}

export const INTERVALO_PLAY_MS = 1500

export interface SesionSimplex extends EstadoSesion {
  snapshot: Snapshot | null
  anteriorSnapshot: Snapshot | null
  total: number
  cargarProblema: (p: Problem, opciones?: OpcionesRun) => void
  cargarTableau: (t: InitialTableau, avisos?: string[], opciones?: OpcionesRun) => void
  limpiar: () => void
  irA: (k: number) => void
  siguiente: () => void
  anterior: () => void
  reiniciar: () => void
  setReproduciendo: (v: boolean) => void
}

export function useSimplexSession(): SesionSimplex {
  const [estado, dispatch] = useReducer(reducer, INICIAL)

  const ejecutar = useCallback(
    (entrada: Problem | InitialTableau, avisos: string[], opciones?: OpcionesRun) => {
      try {
        dispatch({ tipo: 'cargar', resultado: runAll(entrada, opciones), avisos })
      } catch (err) {
        const e =
          err instanceof SolverError
            ? { mensaje: err.message, detalles: err.detalles }
            : { mensaje: String(err), detalles: [] }
        dispatch({ tipo: 'error', error: e })
      }
    },
    [],
  )

  const cargarProblema = useCallback(
    (p: Problem, opciones?: OpcionesRun) => ejecutar(p, [], opciones),
    [ejecutar],
  )
  const cargarTableau = useCallback(
    (t: InitialTableau, avisos: string[] = [], opciones?: OpcionesRun) =>
      ejecutar(t, avisos, opciones),
    [ejecutar],
  )
  const limpiar = useCallback(() => dispatch({ tipo: 'limpiar' }), [])
  const irA = useCallback((k: number) => dispatch({ tipo: 'irA', k }), [])
  const siguiente = useCallback(() => dispatch({ tipo: 'siguiente' }), [])
  const anterior = useCallback(() => dispatch({ tipo: 'anterior' }), [])
  const reiniciar = useCallback(() => dispatch({ tipo: 'reiniciar' }), [])
  const setReproduciendo = useCallback((v: boolean) => dispatch({ tipo: 'play', valor: v }), [])

  useEffect(() => {
    if (!estado.reproduciendo) return
    const id = window.setInterval(() => dispatch({ tipo: 'siguiente' }), INTERVALO_PLAY_MS)
    return () => window.clearInterval(id)
  }, [estado.reproduciendo])

  const snapshot = estado.resultado?.snapshots[estado.k] ?? null
  const anteriorSnapshot = estado.k > 0 ? (estado.resultado?.snapshots[estado.k - 1] ?? null) : null
  const total = estado.resultado?.snapshots.length ?? 0

  return useMemo(
    () => ({
      ...estado,
      snapshot,
      anteriorSnapshot,
      total,
      cargarProblema,
      cargarTableau,
      limpiar,
      irA,
      siguiente,
      anterior,
      reiniciar,
      setReproduciendo,
    }),
    [
      estado,
      snapshot,
      anteriorSnapshot,
      total,
      cargarProblema,
      cargarTableau,
      limpiar,
      irA,
      siguiente,
      anterior,
      reiniciar,
      setReproduciendo,
    ],
  )
}
