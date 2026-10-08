import { describe, expect, it } from 'vitest'
import type { ProblemInput } from '../parseProblem'
import { comprobarInvariantes, esperarFracs, resolver, ultimo } from './helpers'

// Problema clásico (Hillier & Lieberman, Wyndor Glass): óptimo (2, 6), z* = 36.
// Verificado independientemente con scipy.optimize.linprog: x = [2, 6], fun = -36.
const WYNDOR: ProblemInput = {
  sentido: 'max',
  c: ['3', '5'],
  restricciones: [
    { coef: ['1', '0'], rel: '<=', b: '4' },
    { coef: ['0', '2'], rel: '<=', b: '12' },
    { coef: ['3', '2'], rel: '<=', b: '18' },
  ],
}

describe('runAll · problema estándar', () => {
  it('encuentra el óptimo conocido con snapshots coherentes', () => {
    const r = resolver(WYNDOR)
    expect(r.estadoFinal).toBe('optimo')
    expect(r.metodosUsados).toEqual(['primal'])
    esperarFracs(r.solucion!.xDecision, [2, 6])
    expect(r.solucion!.zOriginal.toFraction()).toBe('36')
    // 2 pivotes → snapshots: inicial(+decisión), tras 1º pivote (+decisión), óptimo
    expect(r.snapshots.length).toBe(3)
    expect(r.snapshots.map((s) => s.pivotesRealizados)).toEqual([0, 1, 2])
    comprobarInvariantes(r)
  })

  it('primer pivote: entra x2 (coeficiente -5), sale s2 (cociente 6)', () => {
    const r = resolver(WYNDOR)
    const s0 = r.snapshots[0]!
    expect(s0.pivote).toBeDefined()
    expect(s0.varNames[s0.pivote!.entra]).toBe('x2')
    expect(s0.varNames[s0.pivote!.sale]).toBe('s2')
    const cocientes = s0.pivote!.cocientes
    expect(cocientes[0]!.elegible).toBe(false) // fila 1: a = 0
    expect(cocientes[1]!.valor!.toFraction()).toBe('6')
    expect(cocientes[1]!.minimo).toBe(true)
    expect(cocientes[2]!.valor!.toFraction()).toBe('9')
    expect(s0.explicacion.parrafos.join(' ')).toMatch(/Entra x2/)
    expect(s0.explicacion.parrafos.join(' ')).toMatch(/Sale s2/)
  })

  it('las operaciones de fila producen la tabla siguiente', () => {
    const r = resolver(WYNDOR)
    const s1 = r.snapshots[1]!
    expect(s1.operaciones).toBeDefined()
    expect(s1.operaciones!.fila).toBe(2)
    expect(s1.operaciones!.divisor.toFraction()).toBe('2')
    const elimZ = s1.operaciones!.eliminaciones.find((e) => e.fila === 0)!
    expect(elimZ.factor.toFraction()).toBe('-5')
    esperarFracs(s1.tableau[0]!, [-3, 0, 0, '5/2', 0, 30])
  })

  it('precios sombra y B⁻¹ en el óptimo', () => {
    const r = resolver(WYNDOR)
    // y = (0, 3/2, 1): verificado con el dual (min 4y1 + 12y2 + 18y3)
    esperarFracs(r.solucion!.preciosSombra, [0, '3/2', 1])
    const fin = ultimo(r)
    esperarFracs(fin.cBBinv, [0, '3/2', 1])
    esperarFracs(fin.Binv.flat(), [1, '1/3', '-1/3', 0, '1/2', 0, 0, '-1/3', '1/3'])
    expect(fin.estado).toBe('optimo')
    expect(fin.flags.optimosAlternativosCols).toEqual([])
    expect(fin.explicacion.titulo).toMatch(/óptima/i)
  })

  it('la regla de Bland da el mismo óptimo', () => {
    const r = resolver(WYNDOR, { reglaEntrada: 'bland' })
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.zOriginal.toFraction()).toBe('36')
    expect(r.snapshots[0]!.varNames[r.snapshots[0]!.pivote!.entra]).toBe('x1')
    comprobarInvariantes(r)
  })
})

describe('runAll · minimización sin Dual', () => {
  it('min -3x1 - 5x2 equivale a max y devuelve zOriginal = -36', () => {
    const r = resolver({ ...WYNDOR, sentido: 'min', c: ['-3', '-5'] })
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.zOriginal.toFraction()).toBe('-36')
    esperarFracs(r.solucion!.xDecision, [2, 6])
    esperarFracs(r.solucion!.preciosSombra, [0, '-3/2', -1])
    comprobarInvariantes(r)
  })
})

describe('runAll · degeneración', () => {
  // max 3x1 + 9x2; x1 + 4x2 <= 8; x1 + 2x2 <= 4 → z* = 18 en (0, 2), vértice degenerado.
  const DEGENERADO: ProblemInput = {
    sentido: 'max',
    c: ['3', '9'],
    restricciones: [
      { coef: ['1', '4'], rel: '<=', b: '8' },
      { coef: ['1', '2'], rel: '<=', b: '4' },
    ],
  }
  it('detecta el empate, aplica Bland en la salida y marca la degeneración', () => {
    const r = resolver(DEGENERADO)
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.zOriginal.toFraction()).toBe('18')
    esperarFracs(r.solucion!.xDecision, [0, 2])
    const s0 = r.snapshots[0]!
    expect(s0.pivote!.empates).toEqual([1, 2])
    expect(s0.pivote!.desempatePorBland).toBe(true)
    expect(s0.varNames[s0.pivote!.sale]).toBe('s1')
    expect(s0.explicacion.parrafos.join(' ')).toMatch(/Bland/)
    const s1 = r.snapshots[1]!
    expect(s1.flags.degenerado).toBe(true)
    expect(s1.flags.filasDegeneradas).toEqual([2])
    expect(ultimo(r).flags.degenerado).toBe(true)
    comprobarInvariantes(r)
  })
})

describe('runAll · no acotado', () => {
  it('detecta la columna sin elementos positivos', () => {
    const r = resolver({
      sentido: 'max',
      c: ['1', '1'],
      restricciones: [
        { coef: ['1', '-1'], rel: '<=', b: '1' },
        { coef: ['-1', '1'], rel: '<=', b: '2' },
      ],
    })
    expect(r.estadoFinal).toBe('no_acotado')
    expect(r.solucion).toBeUndefined()
    const fin = ultimo(r)
    expect(fin.estado).toBe('no_acotado')
    expect(fin.varNames[fin.flags.colNoAcotada!]).toBe('x2')
    expect(fin.explicacion.titulo).toMatch(/no acotado/i)
    comprobarInvariantes(r)
  })
})

describe('runAll · infactible', () => {
  it('detecta la fila con b < 0 sin coeficientes negativos', () => {
    const r = resolver({
      sentido: 'max',
      c: ['1', '1'],
      restricciones: [
        { coef: ['1', '1'], rel: '<=', b: '1' },
        { coef: ['1', '1'], rel: '>=', b: '3' },
      ],
    })
    expect(r.estadoFinal).toBe('infactible')
    expect(r.metodosUsados).toEqual(['dual'])
    const fin = ultimo(r)
    expect(fin.estado).toBe('infactible')
    expect(fin.flags.filaInfactible).toBe(1)
    expect(fin.explicacion.titulo).toMatch(/infactible/i)
    comprobarInvariantes(r)
  })

  it('en modo primal se bloquea con aviso si la base inicial no es factible', () => {
    const r = resolver(
      {
        sentido: 'min',
        c: ['3', '2'],
        restricciones: [{ coef: ['1', '1'], rel: '>=', b: '4' }],
      },
      { metodo: 'primal' },
    )
    expect(r.estadoFinal).toBe('bloqueado')
    expect(ultimo(r).flags.motivoBloqueo).toMatch(/Dual/)
  })
})

describe('runAll · Símplex Dual', () => {
  // min 3x1 + 2x2; x1 + x2 >= 4; x1 + 3x2 >= 6 → z* = 8 en (0, 4).
  // linprog: x = [0, 4], fun = 8.
  const DUAL: ProblemInput = {
    sentido: 'min',
    c: ['3', '2'],
    restricciones: [
      { coef: ['1', '1'], rel: '>=', b: '4' },
      { coef: ['1', '3'], rel: '>=', b: '6' },
    ],
  }

  it('invierte z a convención min, pivota por b más negativo y termina óptimo', () => {
    const r = resolver(DUAL)
    expect(r.estadoFinal).toBe('optimo')
    expect(r.metodosUsados).toEqual(['dual'])
    esperarFracs(r.solucion!.xDecision, [0, 4])
    expect(r.solucion!.zOriginal.toFraction()).toBe('8')
    esperarFracs(r.solucion!.preciosSombra, [2, 0])

    const s0 = r.snapshots[0]!
    expect(s0.convencionZ).toBe('max')
    expect(s0.factible).toBe(false)
    expect(s0.explicacion.titulo).toMatch(/Inversión/)
    const s1 = r.snapshots[1]!
    expect(s1.convencionZ).toBe('min')
    expect(s1.cambioConvencion).toEqual({ de: 'max', a: 'min' })
    esperarFracs(s1.tableau[0]!, [-3, -2, 0, 0, 0])
    expect(s1.pivote!.metodo).toBe('dual')
    expect(s1.varNames[s1.pivote!.sale]).toBe('e2') // b = -6
    expect(s1.varNames[s1.pivote!.entra]).toBe('x2') // |−2/−3| = 2/3 < 3
    const coc = s1.pivote!.cocientes
    expect(coc[0]!.valor!.toFraction()).toBe('3')
    expect(coc[1]!.valor!.toFraction()).toBe('2/3')
    expect(coc[2]!.elegible).toBe(false)
    const s2 = r.snapshots[2]!
    expect(s2.varNames[s2.pivote!.sale]).toBe('e1')
    expect(s2.varNames[s2.pivote!.entra]).toBe('e2')
    const fin = ultimo(r)
    expect(fin.convencionZ).toBe('min')
    expect(fin.z.toFraction()).toBe('8')
    comprobarInvariantes(r)
  })

  it('metodo "dual" explícito produce el mismo resultado', () => {
    const r = resolver(DUAL, { metodo: 'dual' })
    expect(r.solucion!.zOriginal.toFraction()).toBe('8')
  })

  it('max con restricción >=: Dual hasta b ≥ 0, se invierte y sigue el estándar', () => {
    // max x1 + x2; x1 + x2 <= 4; x1 >= 1 → z* = 4 (p. ej. (1, 3)).
    const r = resolver({
      sentido: 'max',
      c: ['1', '1'],
      restricciones: [
        { coef: ['1', '1'], rel: '<=', b: '4' },
        { coef: ['1', '0'], rel: '>=', b: '1' },
      ],
    })
    expect(r.estadoFinal).toBe('optimo')
    expect(r.metodosUsados).toEqual(['dual', 'primal'])
    expect(r.solucion!.zOriginal.toFraction()).toBe('4')
    esperarFracs(r.solucion!.xDecision, [1, 3])
    esperarFracs(r.solucion!.preciosSombra, [1, 0])
    const convs = r.snapshots.map((s) => s.convencionZ)
    expect(convs).toEqual(['max', 'min', 'min', 'max', 'max'])
    expect(r.snapshots[1]!.explicacion.parrafos.join(' ')).toMatch(/todavía no es óptimo/)
    expect(r.snapshots[2]!.explicacion.titulo).toMatch(/Inversión/)
    expect(r.snapshots[3]!.cambioConvencion).toEqual({ de: 'min', a: 'max' })
    expect(r.snapshots[3]!.pivote!.metodo).toBe('primal')
    comprobarInvariantes(r)
  })
})

describe('runAll · óptimos alternativos', () => {
  it('marca la variable no básica con coste reducido 0', () => {
    // max 2x1 + 4x2; x1 + 2x2 <= 4; x1 + x2 <= 3 → z* = 8 en toda la arista.
    const r = resolver({
      sentido: 'max',
      c: ['2', '4'],
      restricciones: [
        { coef: ['1', '2'], rel: '<=', b: '4' },
        { coef: ['1', '1'], rel: '<=', b: '3' },
      ],
    })
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.zOriginal.toFraction()).toBe('8')
    expect(r.solucion!.optimosAlternativosCols).toEqual([0])
    const fin = ultimo(r)
    expect(fin.flags.optimosAlternativosCols).toEqual([0])
    expect(fin.explicacion.parrafos.join(' ')).toMatch(/alternativos/i)
    comprobarInvariantes(r)
  })
})

describe('runAll · límites y validación', () => {
  it('se bloquea al superar maxIteraciones', () => {
    const r = resolver(WYNDOR, { maxIteraciones: 1 })
    expect(r.estadoFinal).toBe('bloqueado')
    expect(ultimo(r).flags.motivoBloqueo).toMatch(/máximo/)
  })

  it('los snapshots son inmutables', () => {
    const r = resolver(WYNDOR)
    const s = r.snapshots[0]!
    expect(() => {
      ;(s.tableau[0] as unknown[])[0] = 0
    }).toThrow()
    expect(() => {
      ;(s.basis as number[])[0] = 99
    }).toThrow()
  })
})
