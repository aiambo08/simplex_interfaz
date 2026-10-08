import Fraction from 'fraction.js'
import { SolverError } from './errors'
import { buildInitialTableau } from './buildInitialTableau'
import { elegirPivoteDual } from './dualSimplexStep'
import {
  explicarBloqueo,
  explicarInfactible,
  explicarInicial,
  explicarInversion,
  explicarNoAcotado,
  explicarOptimo,
  explicarPivoteDual,
  explicarPivotePrimal,
} from './explain'
import type { Frac } from './fraction'
import { aplicarPivote, elegirPivotePrimal } from './simplexStep'
import { analizarTableau, invertirRenglonZ, type Analisis } from './tableau'
import { toStandardForm } from './toStandardForm'
import type {
  Convencion,
  Estado,
  Explicacion,
  Flags,
  InitialTableau,
  Metodo,
  OpcionesRun,
  Problem,
  RunResult,
  Snapshot,
  Solucion,
} from './types'

const OPCIONES_DEFECTO: Required<OpcionesRun> = {
  metodo: 'auto',
  reglaEntrada: 'dantzig',
  maxIteraciones: 50,
}

function esProblem(entrada: Problem | InitialTableau): entrada is Problem {
  return 'restricciones' in entrada
}

/** Precio sombra de cada restricción original: ∂z_original/∂b_i, con los ajustes de signo. */
export function preciosSombra(
  tableau: readonly Frac[][],
  inicial: InitialTableau,
  conv: Convencion,
): Frac[] {
  const filaZ = tableau[0]!
  return inicial.basis.map((col, i) => {
    let y = filaZ[col]!
    if (conv === 'min') y = y.neg()
    if (inicial.filasMultiplicadas[i]) y = y.neg()
    if (inicial.signoZ === -1) y = y.neg()
    return y
  })
}

interface Parcial {
  tableau: Frac[][]
  basis: number[]
  conv: Convencion
  an: Analisis
}

/**
 * Ejecuta el método elegido y devuelve todos los snapshots. La UI solo consume el array,
 * así que puede avanzar y retroceder sin recalcular.
 *
 * - `primal`: Símplex estándar (max). Se bloquea si la base inicial no es factible.
 * - `dual` / `auto`: Símplex Dual (min) mientras haya b_i < 0 y el renglón z sea óptimo;
 *   al llegar a una base factible, si no es óptima se invierte z y se sigue con el estándar.
 *   Siguiendo los apuntes, el Dual se aplica aunque el renglón z no sea óptimo (cocientes en
 *   valor absoluto); por eso puede hacer falta volver al estándar después.
 */
export function runAll(entrada: Problem | InitialTableau, opciones: OpcionesRun = {}): RunResult {
  const opts: Required<OpcionesRun> = { ...OPCIONES_DEFECTO, ...opciones }
  const problem = esProblem(entrada) ? entrada : undefined
  const standard = problem ? toStandardForm(problem) : undefined
  const inicial = standard ? buildInitialTableau(standard) : (entrada as InitialTableau)
  validarInicial(inicial)
  const { varNames, nDecision } = inicial

  const snapshots: Snapshot[] = []
  const metodosUsados: Metodo[] = []
  let estadoFinal: Estado = 'continua'
  let solucion: Solucion | undefined

  let actual: Parcial = {
    tableau: inicial.tableau.map((f) => [...f]),
    basis: [...inicial.basis],
    conv: 'max',
    an: analizarTableau(inicial.tableau, inicial.basis, inicial, 'max'),
  }
  let pivotes = 0
  let pendiente: Pick<Snapshot, 'operaciones' | 'cambioConvencion'> = {}
  let explicacionInicial: Explicacion | undefined = explicarInicial(
    varNames,
    actual.basis,
    actual.an,
    'max',
  )

  const flagsBase = (an: Analisis): Flags => ({
    degenerado: an.filasDegeneradas.length > 0,
    filasDegeneradas: an.filasDegeneradas,
    empateFilas: [],
    optimosAlternativosCols: [],
  })

  const emitir = (
    parcial: Omit<
      Snapshot,
      'k' | 'pivotesRealizados' | 'tableau' | 'varNames' | 'basis' | 'convencionZ' | keyof Analisis
    > &
      Partial<Analisis>,
  ): Snapshot => {
    const s: Snapshot = {
      k: snapshots.length,
      pivotesRealizados: pivotes,
      convencionZ: actual.conv,
      tableau: actual.tableau,
      varNames: [...varNames],
      basis: [...actual.basis],
      ...actual.an,
      ...pendiente,
      ...parcial,
    }
    pendiente = {}
    explicacionInicial = undefined
    snapshots.push(congelar(s))
    return s
  }

  const invertir = (siguiente: Metodo): void => {
    const a: Convencion = actual.conv === 'max' ? 'min' : 'max'
    emitir({
      estado: 'continua',
      flags: flagsBase(actual.an),
      metodo: siguiente,
      explicacion: explicarInversion(actual.conv, a, siguiente),
    })
    const tableau = invertirRenglonZ(actual.tableau)
    actual = {
      tableau,
      basis: actual.basis,
      conv: a,
      an: analizarTableau(tableau, actual.basis, inicial, a),
    }
    pendiente = { cambioConvencion: { de: a === 'max' ? 'min' : 'max', a } }
  }

  const terminarOptimo = (): void => {
    const ps = preciosSombra(actual.tableau, inicial, actual.conv)
    const alternativos = actual.an.colsCosteCero
    estadoFinal = 'optimo'
    solucion = {
      x: actual.an.x,
      xDecision: actual.an.x.slice(0, nDecision),
      z: actual.an.z,
      zOriginal: actual.an.zOriginal,
      preciosSombra: ps,
      optimosAlternativosCols: alternativos,
    }
    emitir({
      estado: 'optimo',
      flags: { ...flagsBase(actual.an), optimosAlternativosCols: alternativos },
      explicacion: explicarOptimo(
        varNames,
        actual.basis,
        actual.an,
        nDecision,
        actual.conv,
        ps,
        alternativos,
      ),
    })
  }

  const bloquear = (motivo: string): void => {
    estadoFinal = 'bloqueado'
    emitir({
      estado: 'bloqueado',
      flags: { ...flagsBase(actual.an), motivoBloqueo: motivo },
      explicacion: explicarBloqueo(motivo),
    })
  }

  while (estadoFinal === 'continua') {
    if (pivotes >= opts.maxIteraciones) {
      bloquear(
        `Se alcanzó el máximo de ${opts.maxIteraciones} pivotes sin terminar: posible ciclado. Prueba la regla de Bland como criterio de entrada.`,
      )
      break
    }
    const { an } = actual
    if (an.factible && an.dualFactible) {
      terminarOptimo()
      break
    }
    if (an.factible) {
      if (actual.conv === 'min') {
        invertir('primal')
        continue
      }
      const eleccion = elegirPivotePrimal(actual.tableau, actual.basis, opts.reglaEntrada)
      if (eleccion.estado === 'optimo') {
        terminarOptimo()
        break
      }
      if (eleccion.estado === 'no_acotado') {
        estadoFinal = 'no_acotado'
        emitir({
          estado: 'no_acotado',
          flags: { ...flagsBase(an), colNoAcotada: eleccion.colNoAcotada },
          metodo: 'primal',
          explicacion: explicarNoAcotado(eleccion.colNoAcotada, varNames, actual.tableau),
        })
        break
      }
      if (!metodosUsados.includes('primal')) metodosUsados.push('primal')
      const p = eleccion.pivote
      emitir({
        estado: 'continua',
        flags: { ...flagsBase(an), empateFilas: p.empates },
        pivote: p,
        metodo: 'primal',
        explicacion: explicacionInicial
          ? {
              titulo: explicacionInicial.titulo,
              parrafos: [
                ...explicacionInicial.parrafos,
                ...explicarPivotePrimal(p, varNames, actual.tableau, actual.basis).parrafos,
              ],
            }
          : explicarPivotePrimal(p, varNames, actual.tableau, actual.basis),
      })
      const r = aplicarPivote(actual.tableau, actual.basis, p)
      pivotes++
      pendiente = { operaciones: r.operaciones }
      actual = {
        tableau: r.tableau,
        basis: r.basis,
        conv: actual.conv,
        an: analizarTableau(r.tableau, r.basis, inicial, actual.conv),
      }
      continue
    }

    // Base no factible (algún b_i < 0)
    if (opts.metodo === 'primal') {
      bloquear(
        'La solución básica inicial no es factible (hay b_i < 0) y el Símplex estándar necesita partir de una base factible. Usa el Símplex Dual o el modo Automático.',
      )
      break
    }
    if (actual.conv === 'max') {
      invertir('dual')
      continue
    }
    const eleccion = elegirPivoteDual(actual.tableau, actual.basis)
    if (eleccion.estado === 'infactible') {
      estadoFinal = 'infactible'
      emitir({
        estado: 'infactible',
        flags: { ...flagsBase(an), filaInfactible: eleccion.filaInfactible },
        metodo: 'dual',
        explicacion: explicarInfactible(
          eleccion.filaInfactible,
          varNames,
          actual.basis,
          actual.tableau,
        ),
      })
      break
    }
    if (eleccion.estado === 'factible') {
      // No debería ocurrir: an.factible era falso.
      throw new SolverError('Estado inconsistente en el Símplex Dual.')
    }
    if (!metodosUsados.includes('dual')) metodosUsados.push('dual')
    const p = eleccion.pivote
    emitir({
      estado: 'continua',
      flags: { ...flagsBase(an), empateFilas: p.empates },
      pivote: p,
      metodo: 'dual',
      explicacion: explicarPivoteDual(p, varNames, actual.tableau, actual.basis, an.dualFactible),
    })
    const r = aplicarPivote(actual.tableau, actual.basis, p)
    pivotes++
    pendiente = { operaciones: r.operaciones }
    actual = {
      tableau: r.tableau,
      basis: r.basis,
      conv: actual.conv,
      an: analizarTableau(r.tableau, r.basis, inicial, actual.conv),
    }
  }

  return {
    problem,
    standard,
    inicial,
    snapshots,
    estadoFinal,
    metodosUsados,
    solucion,
    opciones: opts,
  }
}

function validarInicial(inicial: InitialTableau): void {
  const filas = inicial.tableau.length
  if (filas < 2) throw new SolverError('La tabla necesita el renglón z y al menos una restricción.')
  const ancho = inicial.tableau[0]!.length
  if (inicial.tableau.some((f) => f.length !== ancho))
    throw new SolverError('Todas las filas de la tabla deben tener la misma longitud.')
  if (inicial.varNames.length !== ancho - 1)
    throw new SolverError('El número de nombres de variables no coincide con las columnas.')
  if (inicial.basis.length !== filas - 1)
    throw new SolverError('Hace falta una variable básica por restricción.')
  if (inicial.c.length !== ancho - 1)
    throw new SolverError('El vector de costes no coincide con las columnas.')
}

function congelar<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj
  if (obj instanceof Fraction) return Object.freeze(obj)
  for (const v of Object.values(obj as Record<string, unknown>)) congelar(v)
  return Object.freeze(obj)
}
