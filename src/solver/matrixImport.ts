import { SolverError } from './errors'
import { isNeg, isZero, ONE, parseFrac, type Frac } from './fraction'
import type { InitialTableau } from './types'

export type FormatoMatriz = 'auto' | 'csv' | 'json' | 'texto'

export interface MatrizImportada extends InitialTableau {
  avisos: string[]
}

interface Crudo {
  filas: string[][]
  cabecera?: string[]
}

function esNumero(token: string): boolean {
  try {
    parseFrac(token)
    return true
  } catch {
    return false
  }
}

function detectarFormato(texto: string): Exclude<FormatoMatriz, 'auto'> {
  const t = texto.trim()
  if (t.startsWith('[') || t.startsWith('{')) return 'json'
  if (t.includes(';') || t.includes(',')) return 'csv'
  return 'texto'
}

function parsearJson(texto: string): Crudo {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new SolverError('El JSON no es válido.')
  }
  let matriz: unknown
  let cabecera: string[] | undefined
  if (Array.isArray(datos)) {
    matriz = datos
  } else if (datos && typeof datos === 'object') {
    const obj = datos as Record<string, unknown>
    matriz = obj.matriz ?? obj.tabla ?? obj.tableau ?? obj.matrix
    const vars = obj.variables ?? obj.varNames
    if (Array.isArray(vars)) cabecera = vars.map(String)
  }
  if (!Array.isArray(matriz) || matriz.some((f) => !Array.isArray(f))) {
    throw new SolverError(
      'El JSON debe ser un array de filas (arrays de números) o un objeto {"variables": [...], "matriz": [[...]]}.',
    )
  }
  const filas = (matriz as unknown[][]).map((f) => f.map((v) => String(v)))
  return { filas, cabecera }
}

function parsearDelimitado(texto: string, separador: RegExp): Crudo {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
  const filas = lineas.map((l) =>
    l
      .split(separador)
      .map((t) => t.trim())
      .filter((t) => t !== ''),
  )
  if (filas.length === 0) throw new SolverError('La matriz está vacía.')
  const primera = filas[0]!
  if (primera.some((t) => !esNumero(t))) {
    return { filas: filas.slice(1), cabecera: primera }
  }
  return { filas }
}

/**
 * Importa una tabla Símplex ya escrita (renglón z en la primera fila, b en la última columna)
 * desde CSV, JSON o texto separado por espacios. Detecta qué columnas forman la identidad
 * (variables básicas) y avisa si la matriz no está en forma válida.
 */
export function importarMatriz(texto: string, formato: FormatoMatriz = 'auto'): MatrizImportada {
  const fmt = formato === 'auto' ? detectarFormato(texto) : formato
  const crudo =
    fmt === 'json'
      ? parsearJson(texto)
      : fmt === 'csv'
        ? parsearDelimitado(texto, /[;,]/)
        : parsearDelimitado(texto, /\s+/)

  if (crudo.filas.length < 2) {
    throw new SolverError('La matriz necesita al menos dos filas: el renglón z y una restricción.')
  }
  const ancho = crudo.filas[0]!.length
  if (ancho < 2)
    throw new SolverError('La matriz necesita al menos una columna de variables y la columna b.')
  const errores: string[] = []
  crudo.filas.forEach((f, i) => {
    if (f.length !== ancho)
      errores.push(`La fila ${i + 1} tiene ${f.length} valores y se esperaban ${ancho}.`)
  })
  if (errores.length) throw new SolverError('Las filas no tienen la misma longitud.', errores)

  const tableau: Frac[][] = crudo.filas.map((f, i) =>
    f.map((t, j) => {
      try {
        return parseFrac(t)
      } catch (e) {
        errores.push(`Fila ${i + 1}, columna ${j + 1}: ${(e as Error).message}`)
        return ONE
      }
    }),
  )
  if (errores.length) throw new SolverError('Hay valores no numéricos en la matriz.', errores)

  const m = tableau.length - 1
  const nVars = ancho - 1
  const avisos: string[] = []

  let varNames: string[]
  if (crudo.cabecera) {
    let cab = crudo.cabecera.map((s) => s.trim())
    if (cab.length === ancho) cab = cab.slice(0, nVars)
    if (cab.length !== nVars) {
      throw new SolverError(
        `La cabecera tiene ${crudo.cabecera.length} nombres y la matriz ${nVars} columnas de variables (más b).`,
      )
    }
    varNames = cab
  } else {
    varNames = []
  }

  // Detección de columnas identidad: 0 en el renglón z, un 1 y el resto 0.
  const columnaUnidad = (j: number): number | null => {
    if (!isZero(tableau[0]![j]!)) return null
    let filaUno = -1
    for (let i = 1; i <= m; i++) {
      const v = tableau[i]![j]!
      if (v.equals(1)) {
        if (filaUno !== -1) return null
        filaUno = i
      } else if (!isZero(v)) {
        return null
      }
    }
    return filaUno === -1 ? null : filaUno
  }

  const basis: number[] = Array.from({ length: m }, () => -1)
  const identidad: number[] = []
  for (let j = 0; j < nVars; j++) {
    const fila = columnaUnidad(j)
    if (fila === null) continue
    identidad.push(j)
    if (basis[fila - 1] === -1) {
      basis[fila - 1] = j
    } else {
      avisos.push(
        `Las columnas ${basis[fila - 1]! + 1} y ${j + 1} son ambas vectores unitarios de la fila ${fila}; se toma la primera como básica.`,
      )
    }
  }
  const sinBase = basis.map((b, i) => (b === -1 ? i + 1 : -1)).filter((i) => i > 0)
  if (sinBase.length > 0) {
    throw new SolverError(
      'La matriz no está en forma válida: cada fila necesita una variable básica (columna de la identidad con 0 en el renglón z).',
      sinBase.map((i) => `La fila ${i} no tiene columna identidad asociada.`),
    )
  }

  if (varNames.length === 0) {
    const esBase = new Set(basis)
    let kx = 0
    let ks = 0
    varNames = Array.from({ length: nVars }, (_, j) => (esBase.has(j) ? `s${++ks}` : `x${++kx}`))
    avisos.push(
      `Sin cabecera: las columnas identidad se han llamado ${basis.map((j) => varNames[j]).join(', ')} y el resto x1, x2, …`,
    )
  }

  for (let i = 1; i <= m; i++) {
    if (isNeg(tableau[i]![nVars]!)) {
      avisos.push(
        `La fila ${i} tiene b = ${tableau[i]![nVars]!.toFraction()} < 0: la base inicial no es factible y hará falta el Símplex Dual.`,
      )
    }
  }
  if (!isZero(tableau[0]![nVars]!)) {
    avisos.push(
      `El término independiente del renglón z es ${tableau[0]![nVars]!.toFraction()} (z actual ≠ 0).`,
    )
  }

  const nDecision = nVars - m
  return {
    tableau,
    varNames,
    basis,
    nDecision: nDecision > 0 ? nDecision : nVars,
    signoZ: 1,
    filasMultiplicadas: Array.from({ length: m }, () => false),
    c: tableau[0]!.slice(0, nVars).map((v) => v.neg()),
    avisos,
  }
}
