import { describe, expect, it } from 'vitest'
import { EJEMPLOS } from '../examples/ejemplos'
import { frac, parseProblem, runAll } from '../solver'
import { esFactible3D, geometria3D, interseccion3 } from './poliedro3d'

const mezcla = () => parseProblem(EJEMPLOS.find((e) => e.id === 'mezcla-3v')!.input)

describe('geometria3D', () => {
  it('devuelve null si el problema no tiene 3 variables', () => {
    const p = parseProblem(EJEMPLOS.find((e) => e.id === 'produccion-2v')!.input)
    expect(geometria3D(p, runAll(p).snapshots)).toBeNull()
  })

  it('calcula vértices factibles, aristas y caras del ejemplo de mezcla', () => {
    const p = mezcla()
    const r = runAll(p)
    const g = geometria3D(p, r.snapshots)!
    expect(g.vertices.length).toBeGreaterThanOrEqual(4)
    for (const v of g.vertices) {
      expect(esFactible3D(p, v.x)).toBe(true)
      expect(v.planos.length).toBeGreaterThanOrEqual(3)
    }
    expect(g.aristas.length).toBeGreaterThanOrEqual(6)
    for (const a of g.aristas) {
      const comunes = g.vertices[a.i]!.planos.filter((id) => g.vertices[a.j]!.planos.includes(id))
      expect(comunes.length).toBeGreaterThanOrEqual(2)
    }
    expect(g.caras.length).toBeGreaterThanOrEqual(4)
    for (const c of g.caras) expect(c.vertices.length).toBeGreaterThanOrEqual(3)
    expect(g.vertices.some((v) => v.x.map((c) => c.valueOf()).join(',') === '2,0,1')).toBe(true)
  })

  it('la trayectoria termina en el óptimo (2, 0, 1) y todos sus puntos son factibles', () => {
    const p = mezcla()
    const r = runAll(p)
    const g = geometria3D(p, r.snapshots)!
    expect(g.trayectoria[0]!.x.map((c) => c.valueOf())).toEqual([0, 0, 0])
    expect(g.trayectoria.at(-1)!.x.map((c) => c.valueOf())).toEqual([2, 0, 1])
    expect(g.trayectoria.at(-1)!.z.valueOf()).toBe(13)
    expect(g.trayectoria.every((t) => t.factible)).toBe(true)
    for (const t of g.trayectoria) {
      expect(g.vertices.some((v) => v.x.every((c, d) => c.equals(t.x[d]!)))).toBe(true)
    }
  })

  it('interseccion3 es exacta y detecta planos sin punto común', () => {
    const p = mezcla()
    const g = geometria3D(p, [])!
    const [e0, e1, e2] = g.planos.filter((pl) => pl.rel === 'eje')
    expect(interseccion3(e0!, e1!, e2!)!.map((c) => c.valueOf())).toEqual([0, 0, 0])
    const caja0 = g.planos.find((pl) => pl.id === 'caja0')!
    expect(interseccion3(e0!, caja0, e1!)).toBeNull()
    expect(esFactible3D(p, [frac(-1), frac(0), frac(0)])).toBe(false)
  })
})
