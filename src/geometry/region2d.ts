import {
  frac,
  isZero,
  toNumber,
  type Frac,
  type Problem,
  type Relacion,
  type Snapshot,
} from '../solver'

/** Recta a·x = b en el plano (x1, x2). Las restricciones originales y los dos ejes. */
export interface Recta {
  id: string
  etiqueta: string
  a: [Frac, Frac]
  b: Frac
  rel: Relacion | 'eje'
  /** Índice de la restricción original, o -1 para los ejes y el recuadro de recorte. */
  indice: number
}

export interface Vertice {
  x: [Frac, Frac]
  factible: boolean
  /** Ids de las dos rectas que se cortan en el vértice. */
  rectas: [string, string]
}

export interface Punto2D {
  k: number
  x: [Frac, Frac]
  factible: boolean
  z: Frac
}

export interface Geometria2D {
  rectas: Recta[]
  /** Todas las intersecciones de pares de rectas (restricciones y ejes) en el cuadrante x ≥ 0. */
  vertices: Vertice[]
  /** Vértices factibles ordenados en sentido antihorario; si la región no está acotada incluye los puntos de recorte. */
  poligono: [Frac, Frac][]
  acotada: boolean
  /** Punto (x1, x2) de cada snapshot. */
  trayectoria: Punto2D[]
  /** Dirección de mejora de z en el plano: c para max, −c para min. */
  gradiente: [Frac, Frac]
  /** Extensión del dibujo (floats). */
  limites: { xMax: number; yMax: number }
}

function cumple(valor: Frac, rel: Relacion, b: Frac): boolean {
  const c = valor.compare(b)
  return rel === '<=' ? c <= 0 : rel === '>=' ? c >= 0 : c === 0
}

/** Comprueba si el punto satisface todas las restricciones originales y x ≥ 0. */
export function esFactible(problem: Problem, x: readonly [Frac, Frac]): boolean {
  if (x[0].compare(0) < 0 || x[1].compare(0) < 0) return false
  return problem.restricciones.every((r) =>
    cumple(r.coef[0]!.mul(x[0]).add(r.coef[1]!.mul(x[1])), r.rel, r.b),
  )
}

/** Intersección exacta de dos rectas; null si son paralelas. */
export function interseccion(r1: Recta, r2: Recta): [Frac, Frac] | null {
  const det = r1.a[0].mul(r2.a[1]).sub(r1.a[1].mul(r2.a[0]))
  if (isZero(det)) return null
  const x = r1.b.mul(r2.a[1]).sub(r1.a[1].mul(r2.b)).div(det)
  const y = r1.a[0].mul(r2.b).sub(r1.b.mul(r2.a[0])).div(det)
  return [x, y]
}

function rectasDe(problem: Problem): Recta[] {
  const [n1, n2] = problem.nombresVars as [string, string]
  const rectas: Recta[] = problem.restricciones.map((r, i) => ({
    id: `R${i + 1}`,
    etiqueta: `R${i + 1}`,
    a: [r.coef[0]!, r.coef[1]!],
    b: r.b,
    rel: r.rel,
    indice: i,
  }))
  rectas.push({
    id: 'ejeX1',
    etiqueta: `${n1} = 0`,
    a: [frac(1), frac(0)],
    b: frac(0),
    rel: 'eje',
    indice: -1,
  })
  rectas.push({
    id: 'ejeX2',
    etiqueta: `${n2} = 0`,
    a: [frac(0), frac(1)],
    b: frac(0),
    rel: 'eje',
    indice: -1,
  })
  return rectas
}

function ordenarAntihorario(puntos: [Frac, Frac][]): [Frac, Frac][] {
  if (puntos.length < 3) return puntos
  const cx = puntos.reduce((s, p) => s + toNumber(p[0]), 0) / puntos.length
  const cy = puntos.reduce((s, p) => s + toNumber(p[1]), 0) / puntos.length
  return [...puntos].sort(
    (p, q) =>
      Math.atan2(toNumber(p[1]) - cy, toNumber(p[0]) - cx) -
      Math.atan2(toNumber(q[1]) - cy, toNumber(q[0]) - cx),
  )
}

function anadirUnico(lista: Vertice[], v: Vertice): void {
  if (!lista.some((w) => w.x[0].equals(v.x[0]) && w.x[1].equals(v.x[1]))) lista.push(v)
}

/**
 * Geometría del problema de 2 variables: rectas, vértices, polígono factible y trayectoria del
 * Símplex sobre los snapshots. Devuelve null si el problema no tiene exactamente 2 variables.
 */
export function geometria2D(problem: Problem, snapshots: readonly Snapshot[]): Geometria2D | null {
  if (problem.nombresVars.length !== 2) return null
  const rectas = rectasDe(problem)

  const vertices: Vertice[] = []
  for (let i = 0; i < rectas.length; i++) {
    for (let j = i + 1; j < rectas.length; j++) {
      const p = interseccion(rectas[i]!, rectas[j]!)
      if (!p || p[0].compare(0) < 0 || p[1].compare(0) < 0) continue
      anadirUnico(vertices, {
        x: p,
        factible: esFactible(problem, p),
        rectas: [rectas[i]!.id, rectas[j]!.id],
      })
    }
  }

  const trayectoria: Punto2D[] = snapshots.map((s) => {
    const x: [Frac, Frac] = [s.x[0]!, s.x[1]!]
    return { k: s.k, x, factible: esFactible(problem, x), z: s.zOriginal }
  })

  const candidatos = [
    ...vertices.map((v) => v.x),
    ...trayectoria.map((p) => p.x),
    ...rectas
      .filter((r) => r.indice >= 0)
      .flatMap((r) => {
        const pts: [Frac, Frac][] = []
        if (!isZero(r.a[0])) pts.push([r.b.div(r.a[0]), frac(0)])
        if (!isZero(r.a[1])) pts.push([frac(0), r.b.div(r.a[1])])
        return pts.filter((p) => p[0].compare(0) >= 0 && p[1].compare(0) >= 0)
      }),
  ]
  const maxX = Math.max(1, ...candidatos.map((p) => toNumber(p[0])))
  const maxY = Math.max(1, ...candidatos.map((p) => toNumber(p[1])))
  const limites = { xMax: Math.ceil(maxX * 1.2), yMax: Math.ceil(maxY * 1.2) }

  const factibles = vertices.filter((v) => v.factible).map((v) => v.x)
  const caja: Recta[] = [
    {
      id: 'cajaX',
      etiqueta: '',
      a: [frac(1), frac(0)],
      b: frac(limites.xMax),
      rel: '<=',
      indice: -1,
    },
    {
      id: 'cajaY',
      etiqueta: '',
      a: [frac(0), frac(1)],
      b: frac(limites.yMax),
      rel: '<=',
      indice: -1,
    },
  ]
  const todas = [...rectas, ...caja]
  const recorte: [Frac, Frac][] = []
  for (const c of caja) {
    for (const r of todas) {
      if (r === c) continue
      const p = interseccion(c, r)
      if (!p || p[0].compare(0) < 0 || p[1].compare(0) < 0) continue
      if (p[0].compare(limites.xMax) > 0 || p[1].compare(limites.yMax) > 0) continue
      if (esFactible(problem, p) && !recorte.some((q) => q[0].equals(p[0]) && q[1].equals(p[1])))
        recorte.push(p)
    }
  }
  const acotada = recorte.length === 0
  const poligono = ordenarAntihorario([...factibles, ...recorte])

  const gradiente: [Frac, Frac] =
    problem.sentido === 'max'
      ? [problem.c[0]!, problem.c[1]!]
      : [problem.c[0]!.neg(), problem.c[1]!.neg()]

  return { rectas, vertices, poligono, acotada, trayectoria, gradiente, limites }
}

/**
 * Restricciones activas en el vértice del snapshot, deducidas de las variables no básicas
 * (valen 0): x_j no básica ⇔ eje x_j = 0; s_i / e_i no básica ⇔ restricción i activa.
 */
export function restriccionesActivas(problem: Problem, s: Snapshot): string[] {
  const n = problem.nombresVars.length
  const activas: string[] = []
  s.varNames.forEach((nombre, j) => {
    if (s.basis.includes(j)) return
    if (j < n) activas.push(`${nombre} = 0`)
    else {
      const i = j - n
      const r = problem.restricciones[i]
      if (r) activas.push(`R${i + 1} (${nombre} = 0)`)
    }
  })
  return activas
}

/**
 * Dirección en el plano (x1, x2) por la que z crece sin límite cuando el snapshot es no acotado:
 * la variable que entra aumenta y las básicas varían según −a_ie.
 */
export function direccionNoAcotada(s: Snapshot): [Frac, Frac] | null {
  const col = s.flags.colNoAcotada
  if (col === undefined) return null
  const d: Frac[] = [frac(0), frac(0)]
  if (col < 2) d[col] = frac(1)
  s.basis.forEach((j, i) => {
    if (j < 2) d[j] = s.tableau[i + 1]![col]!.neg()
  })
  return [d[0]!, d[1]!]
}
