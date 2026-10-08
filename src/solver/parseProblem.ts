import { SolverError } from './errors'
import { parseFrac, type Frac } from './fraction'
import type { Problem, Relacion, Sentido } from './types'

export interface RestriccionInput {
  coef: string[]
  rel: Relacion
  b: string
}

/** Entrada del formulario guiado: todo en texto, se valida aquí. */
export interface ProblemInput {
  sentido: Sentido
  c: string[]
  restricciones: RestriccionInput[]
  nombresVars?: string[]
}

export const RELACIONES: readonly Relacion[] = ['<=', '>=', '=']

export function nombresPorDefecto(n: number, prefijo = 'x'): string[] {
  return Array.from({ length: n }, (_, j) => `${prefijo}${j + 1}`)
}

function parsearLista(valores: string[], contexto: string, errores: string[]): Frac[] {
  return valores.map((v, j) => {
    try {
      return parseFrac(v)
    } catch (e) {
      errores.push(`${contexto}, coeficiente ${j + 1}: ${(e as Error).message}`)
      return parseFrac('0')
    }
  })
}

/**
 * Convierte la entrada del formulario en un Problem con fracciones exactas.
 * Acumula todos los errores de validación y los lanza juntos en un SolverError.
 */
export function parseProblem(input: ProblemInput): Problem {
  const errores: string[] = []
  const n = input.c.length

  if (input.sentido !== 'max' && input.sentido !== 'min') {
    errores.push('El tipo de problema debe ser "max" o "min".')
  }
  if (n === 0) {
    errores.push('La función objetivo necesita al menos una variable.')
  }
  if (input.restricciones.length === 0) {
    errores.push('Hace falta al menos una restricción.')
  }

  const c = parsearLista(input.c, 'Función objetivo', errores)

  const restricciones = input.restricciones.map((r, i) => {
    const contexto = `Restricción ${i + 1}`
    if (r.coef.length !== n) {
      errores.push(`${contexto}: tiene ${r.coef.length} coeficientes y se esperaban ${n}.`)
    }
    if (!RELACIONES.includes(r.rel)) {
      errores.push(`${contexto}: la relación debe ser ≤, ≥ o =.`)
    }
    const coef = parsearLista(r.coef, contexto, errores)
    let b: Frac
    try {
      b = parseFrac(r.b)
    } catch (e) {
      errores.push(`${contexto}, término independiente: ${(e as Error).message}`)
      b = parseFrac('0')
    }
    if (coef.length === n && coef.every((v) => v.equals(0))) {
      errores.push(`${contexto}: todos los coeficientes son 0; la restricción no depende de x.`)
    }
    return { coef, rel: r.rel, b }
  })

  const nombresVars = input.nombresVars ?? nombresPorDefecto(n)
  if (nombresVars.length !== n) {
    errores.push(`Hay ${nombresVars.length} nombres de variables y ${n} coeficientes.`)
  }
  if (new Set(nombresVars.map((s) => s.trim())).size !== nombresVars.length) {
    errores.push('Los nombres de las variables deben ser distintos.')
  }
  if (nombresVars.some((s) => s.trim() === '')) {
    errores.push('Hay nombres de variables vacíos.')
  }

  if (errores.length > 0) {
    throw new SolverError('El problema tiene errores de entrada.', errores)
  }

  return { sentido: input.sentido, c, restricciones, nombresVars: nombresVars.map((s) => s.trim()) }
}
