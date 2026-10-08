import { describe, expect, it } from 'vitest'
import { SolverError } from '../errors'
import { importarMatriz } from '../matrixImport'
import { runAll } from '../runAll'
import { esperarFracs } from './helpers'

const CSV = `x1,x2,s1,s2,s3,b
-3,-5,0,0,0,0
1,0,1,0,0,4
0,2,0,1,0,12
3,2,0,0,1,18`

describe('importarMatriz', () => {
  it('lee CSV con cabecera y detecta la base', () => {
    const m = importarMatriz(CSV)
    expect(m.varNames).toEqual(['x1', 'x2', 's1', 's2', 's3'])
    expect(m.basis).toEqual([2, 3, 4])
    expect(m.nDecision).toBe(2)
    esperarFracs(m.c, [3, 5, 0, 0, 0])
    const r = runAll(m)
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.zOriginal.toFraction()).toBe('36')
  })

  it('lee texto separado por espacios sin cabecera y nombra las columnas', () => {
    const m = importarMatriz(`-3 -5 0 0 0 0
1 0 1 0 0 4
0 2 0 1 0 12
3 2 0 0 1 18`)
    expect(m.varNames).toEqual(['x1', 'x2', 's1', 's2', 's3'])
    expect(m.avisos.some((a) => a.includes('Sin cabecera'))).toBe(true)
  })

  it('lee JSON con fracciones y avisa de b negativos', () => {
    const m = importarMatriz(
      JSON.stringify({
        variables: ['x', 'y', 's1', 's2'],
        matriz: [
          ['3', '2', 0, 0, 0],
          [-1, -1, 1, 0, -4],
          ['-1', '-3', 0, 1, '-6'],
        ],
      }),
    )
    expect(m.basis).toEqual([2, 3])
    expect(m.avisos.filter((a) => a.includes('< 0')).length).toBe(2)
    const r = runAll(m)
    expect(r.estadoFinal).toBe('optimo')
    expect(r.solucion!.z.toFraction()).toBe('8')
  })

  it('rechaza matrices sin identidad, con filas desiguales o valores inválidos', () => {
    expect(() => importarMatriz('1,2,3\n4,5,6')).toThrow(SolverError)
    expect(() => importarMatriz('1,2,3\n4,5')).toThrow(/misma longitud/)
    expect(() => importarMatriz('1,a,3\n4,5,6')).toThrow(SolverError)
    expect(() => importarMatriz('1,2,3')).toThrow(/dos filas/)
    expect(() => importarMatriz('{')).toThrow(/JSON/)
  })

  it('rechaza cabeceras con longitud incorrecta', () => {
    expect(() => importarMatriz('a,b,c,d,e\n-1,0,0,0\n1,1,0,2\n0,0,1,3')).toThrow(/cabecera/i)
  })
})
