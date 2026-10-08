import { describe, expect, it } from 'vitest'
import { EJEMPLOS } from '../examples/ejemplos'
import { frac, parseProblem, runAll } from '../solver'
import {
  direccionNoAcotada,
  esFactible,
  geometria2D,
  interseccion,
  restriccionesActivas,
} from './region2d'

const ejemplo = (id: string) => parseProblem(EJEMPLOS.find((e) => e.id === id)!.input)
const coords = (p: readonly [import('../solver').Frac, import('../solver').Frac]) => [
  p[0].valueOf(),
  p[1].valueOf(),
]

describe('geometria2D', () => {
  it('devuelve null si el problema no tiene 2 variables', () => {
    const p = ejemplo('mezcla-3v')
    expect(geometria2D(p, runAll(p).snapshots)).toBeNull()
  })

  it('calcula los vértices factibles del ejemplo de producción y el polígono acotado', () => {
    const p = ejemplo('produccion-2v')
    const g = geometria2D(p, runAll(p).snapshots)!
    const factibles = g.vertices.filter((v) => v.factible).map((v) => coords(v.x))
    expect(factibles).toHaveLength(5)
    for (const esperado of [
      [0, 0],
      [4, 0],
      [4, 3],
      [2, 6],
      [0, 6],
    ]) {
      expect(factibles).toContainEqual(esperado)
    }
    expect(g.acotada).toBe(true)
    expect(g.poligono).toHaveLength(5)
    expect(g.vertices.some((v) => !v.factible)).toBe(true)
    expect(g.rectas.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'ejeX1', 'ejeX2'])
    expect(g.gradiente.map((c) => c.valueOf())).toEqual([3, 5])
  })

  it('la trayectoria sigue los vértices del Símplex hasta el óptimo (2, 6)', () => {
    const p = ejemplo('produccion-2v')
    const g = geometria2D(p, runAll(p).snapshots)!
    expect(g.trayectoria.map((t) => coords(t.x))).toEqual([
      [0, 0],
      [0, 6],
      [2, 6],
    ])
    expect(g.trayectoria.every((t) => t.factible)).toBe(true)
    expect(g.trayectoria.at(-1)!.z.valueOf()).toBe(36)
  })

  it('en el Símplex Dual la trayectoria pasa por puntos no factibles hasta llegar a la región', () => {
    const p = ejemplo('dieta-dual')
    const g = geometria2D(p, runAll(p).snapshots)!
    expect(g.trayectoria[0]!.factible).toBe(false)
    expect(g.trayectoria.at(-1)!.factible).toBe(true)
    expect(coords(g.trayectoria.at(-1)!.x)).toEqual([0, 4])
    expect(g.acotada).toBe(false)
    expect(g.gradiente.map((c) => c.valueOf())).toEqual([-3, -2])
  })

  it('detecta la región no acotada y la dirección de crecimiento infinito', () => {
    const p = ejemplo('no-acotado')
    const r = runAll(p)
    const g = geometria2D(p, r.snapshots)!
    expect(g.acotada).toBe(false)
    const ultimo = r.snapshots.at(-1)!
    expect(ultimo.estado).toBe('no_acotado')
    const d = direccionNoAcotada(ultimo)!
    expect(d.map((c) => c.valueOf())).toEqual([1, 1])
    expect(d[0].compare(0) >= 0 && d[1].compare(0) >= 0).toBe(true)
    expect(d.some((c) => c.compare(0) > 0)).toBe(true)
    expect(direccionNoAcotada(r.snapshots[0]!)).toBeNull()
  })

  it('relaciona las variables no básicas con las restricciones activas del vértice', () => {
    const p = ejemplo('produccion-2v')
    const r = runAll(p)
    expect(restriccionesActivas(p, r.snapshots[0]!)).toEqual(['x1 = 0', 'x2 = 0'])
    expect(restriccionesActivas(p, r.snapshots.at(-1)!)).toEqual(['R2 (s2 = 0)', 'R3 (s3 = 0)'])
  })

  it('interseccion y esFactible son exactos', () => {
    const p = ejemplo('produccion-2v')
    const g = geometria2D(p, [])!
    const [r1, , r3] = g.rectas
    expect(coords(interseccion(r1!, r3!)!)).toEqual([4, 3])
    expect(interseccion(r1!, g.rectas[3]!)).toBeNull()
    expect(esFactible(p, [frac(1), frac(1)])).toBe(true)
    expect(esFactible(p, [frac(5), frac(0)])).toBe(false)
    expect(esFactible(p, [frac(-1), frac(0)])).toBe(false)
  })
})
