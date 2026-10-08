import {
  frac,
  isZero,
  toNumber,
  type Frac,
  type Problem,
  type Relacion,
  type Snapshot,
} from '../solver'

export type P3 = [Frac, Frac, Frac]

export interface Plano {
  id: string
  etiqueta: string
  a: P3
  b: Frac
  rel: Relacion | 'eje' | 'caja'
}

export interface Vertice3D {
  x: P3
  planos: string[]
}

export interface Arista {
  i: number
  j: number
}

export interface Cara {
  plano: string
  /** Índices de vértices ordenados alrededor de la cara. */
  vertices: number[]
}

export interface Punto3D {
  k: number
  x: P3
  factible: boolean
  z: Frac
}

export interface Geometria3D {
  planos: Plano[]
  vertices: Vertice3D[]
  aristas: Arista[]
  caras: Cara[]
  trayectoria: Punto3D[]
  acotada: boolean
  limites: [number, number, number]
}

const dot = (a: P3, x: P3) => a[0].mul(x[0]).add(a[1].mul(x[1])).add(a[2].mul(x[2]))

function cumple(valor: Frac, rel: Plano['rel'], b: Frac): boolean {
  const c = valor.compare(b)
  if (rel === '>=') return c >= 0
  if (rel === '=') return c === 0
  return c <= 0
}

export function esFactible3D(problem: Problem, x: P3): boolean {
  if (x.some((v) => v.compare(0) < 0)) return false
  return problem.restricciones.every((r) =>
    cumple(dot([r.coef[0]!, r.coef[1]!, r.coef[2]!], x), r.rel, r.b),
  )
}

/** Resuelve el sistema 3×3 de tres planos (Cramer exacto); null si no se cortan en un punto. */
export function interseccion3(p: Plano, q: Plano, r: Plano): P3 | null {
  const det3 = (m: Frac[][]) =>
    m[0]![0]!
      .mul(m[1]![1]!.mul(m[2]![2]!).sub(m[1]![2]!.mul(m[2]![1]!)))
      .sub(m[0]![1]!.mul(m[1]![0]!.mul(m[2]![2]!).sub(m[1]![2]!.mul(m[2]![0]!))))
      .add(m[0]![2]!.mul(m[1]![0]!.mul(m[2]![1]!).sub(m[1]![1]!.mul(m[2]![0]!))))
  const A = [p.a, q.a, r.a].map((f) => [...f])
  const b = [p.b, q.b, r.b]
  const D = det3(A)
  if (isZero(D)) return null
  const col = (c: number) => det3(A.map((fila, i) => fila.map((v, j) => (j === c ? b[i]! : v))))
  return [col(0).div(D), col(1).div(D), col(2).div(D)]
}

function ordenarCara(puntos: number[], vertices: Vertice3D[], normal: P3): number[] {
  const n = normal.map(toNumber) as [number, number, number]
  const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const u = [
    n[1] * ref[2]! - n[2] * ref[1]!,
    n[2] * ref[0]! - n[0] * ref[2]!,
    n[0] * ref[1]! - n[1] * ref[0]!,
  ]
  const v = [n[1] * u[2]! - n[2] * u[1]!, n[2] * u[0]! - n[0] * u[2]!, n[0] * u[1]! - n[1] * u[0]!]
  const coords = puntos.map((i) => vertices[i]!.x.map(toNumber))
  const c = [0, 1, 2].map((d) => coords.reduce((s, p) => s + p[d]!, 0) / coords.length)
  const ang = (p: number[]) => {
    const d = [p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!]
    return Math.atan2(
      d[0]! * v[0]! + d[1]! * v[1]! + d[2]! * v[2]!,
      d[0]! * u[0]! + d[1]! * u[1]! + d[2]! * u[2]!,
    )
  }
  return puntos
    .map((i, idx) => ({ i, a: ang(coords[idx]!) }))
    .sort((p, q) => p.a - q.a)
    .map((p) => p.i)
}

/** Poliedro factible de un problema con 3 variables, con trayectoria del Símplex. Null si no hay 3 variables. */
export function geometria3D(problem: Problem, snapshots: readonly Snapshot[]): Geometria3D | null {
  if (problem.nombresVars.length !== 3) return null
  const base: Plano[] = problem.restricciones.map((r, i) => ({
    id: `R${i + 1}`,
    etiqueta: `R${i + 1}`,
    a: [r.coef[0]!, r.coef[1]!, r.coef[2]!],
    b: r.b,
    rel: r.rel,
  }))
  problem.nombresVars.forEach((nombre, j) => {
    const a: P3 = [frac(0), frac(0), frac(0)]
    a[j] = frac(1)
    base.push({ id: `eje${j}`, etiqueta: `${nombre} = 0`, a, b: frac(0), rel: 'eje' })
  })

  const trayectoria: Punto3D[] = snapshots.map((s) => {
    const x: P3 = [s.x[0]!, s.x[1]!, s.x[2]!]
    return { k: s.k, x, factible: esFactible3D(problem, x), z: s.zOriginal }
  })

  const candidatos: P3[] = [...trayectoria.map((t) => t.x)]
  for (let i = 0; i < base.length; i++)
    for (let j = i + 1; j < base.length; j++)
      for (let l = j + 1; l < base.length; l++) {
        const p = interseccion3(base[i]!, base[j]!, base[l]!)
        if (p && esFactible3D(problem, p)) candidatos.push(p)
      }
  const limites = [0, 1, 2].map((d) =>
    Math.ceil(Math.max(1, ...candidatos.map((p) => toNumber(p[d]!))) * 1.2),
  ) as [number, number, number]

  const planos: Plano[] = [...base]
  limites.forEach((L, j) => {
    const a: P3 = [frac(0), frac(0), frac(0)]
    a[j] = frac(1)
    planos.push({ id: `caja${j}`, etiqueta: '', a, b: frac(L), rel: 'caja' })
  })

  const enCaja = (x: P3) => x.every((v, d) => v.compare(limites[d]!) <= 0)
  const vertices: Vertice3D[] = []
  for (let i = 0; i < planos.length; i++)
    for (let j = i + 1; j < planos.length; j++)
      for (let l = j + 1; l < planos.length; l++) {
        const p = interseccion3(planos[i]!, planos[j]!, planos[l]!)
        if (!p || !esFactible3D(problem, p) || !enCaja(p)) continue
        if (vertices.some((v) => v.x.every((c, d) => c.equals(p[d]!)))) continue
        const enPlanos = planos.filter((pl) => dot(pl.a, p).equals(pl.b)).map((pl) => pl.id)
        vertices.push({ x: p, planos: enPlanos })
      }

  const aristas: Arista[] = []
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++) {
      const comunes = vertices[i]!.planos.filter((id) => vertices[j]!.planos.includes(id))
      if (comunes.length < 2) continue
      const vi = vertices[i]!.x
      const vj = vertices[j]!.x
      const intermedio = vertices.some((w, l) => {
        if (l === i || l === j) return false
        if (!comunes.every((id) => w.planos.includes(id))) return false
        return [0, 1, 2].every((d) => {
          const lo = vi[d]!.compare(vj[d]!) <= 0 ? vi[d]! : vj[d]!
          const hi = vi[d]!.compare(vj[d]!) <= 0 ? vj[d]! : vi[d]!
          return w.x[d]!.compare(lo) >= 0 && w.x[d]!.compare(hi) <= 0
        })
      })
      if (!intermedio) aristas.push({ i, j })
    }

  const caras: Cara[] = planos
    .map((pl) => ({
      plano: pl.id,
      vertices: vertices.map((v, i) => (v.planos.includes(pl.id) ? i : -1)).filter((i) => i >= 0),
    }))
    .filter((c) => c.vertices.length >= 3)
    .map((c) => ({
      ...c,
      vertices: ordenarCara(c.vertices, vertices, planos.find((p) => p.id === c.plano)!.a),
    }))

  const acotada = !vertices.some((v) => v.planos.some((id) => id.startsWith('caja')))
  return { planos, vertices, aristas, caras, trayectoria, acotada, limites }
}
