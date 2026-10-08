import type { ProblemInput } from '../solver'

export interface Ejemplo {
  id: string
  nombre: string
  descripcion: string
  input: ProblemInput
}

export const EJEMPLOS: Ejemplo[] = [
  {
    id: 'produccion-2v',
    nombre: 'Producción (2 variables)',
    descripcion:
      'Problema clásico de maximización con tres recursos. Óptimo en (2, 6) con z* = 36.',
    input: {
      sentido: 'max',
      c: ['3', '5'],
      restricciones: [
        { coef: ['1', '0'], rel: '<=', b: '4' },
        { coef: ['0', '2'], rel: '<=', b: '12' },
        { coef: ['3', '2'], rel: '<=', b: '18' },
      ],
    },
  },
  {
    id: 'mezcla-3v',
    nombre: 'Mezcla (3 variables)',
    descripcion:
      'Maximización con tres variables y tres restricciones. Óptimo en (2, 0, 1) con z* = 13.',
    input: {
      sentido: 'max',
      c: ['5', '4', '3'],
      restricciones: [
        { coef: ['2', '3', '1'], rel: '<=', b: '5' },
        { coef: ['4', '1', '2'], rel: '<=', b: '11' },
        { coef: ['3', '4', '2'], rel: '<=', b: '8' },
      ],
    },
  },
  {
    id: 'dieta-dual',
    nombre: 'Dieta (minimizar con ≥, Símplex Dual)',
    descripcion:
      'Minimización con restricciones ≥: la base inicial no es factible y se usa el Símplex Dual. Óptimo en (0, 4) con z* = 8.',
    input: {
      sentido: 'min',
      c: ['3', '2'],
      restricciones: [
        { coef: ['1', '1'], rel: '>=', b: '4' },
        { coef: ['1', '3'], rel: '>=', b: '6' },
      ],
    },
  },
  {
    id: 'degenerado',
    nombre: 'Degeneración (empate de cocientes)',
    descripcion:
      'Empate en el cociente mínimo; se aplica la regla de Bland y aparece una variable básica con valor 0.',
    input: {
      sentido: 'max',
      c: ['3', '9'],
      restricciones: [
        { coef: ['1', '4'], rel: '<=', b: '8' },
        { coef: ['1', '2'], rel: '<=', b: '4' },
      ],
    },
  },
  {
    id: 'alternativos',
    nombre: 'Óptimos alternativos',
    descripcion:
      'En el óptimo una variable no básica tiene coste reducido 0: toda una arista es óptima (z* = 8).',
    input: {
      sentido: 'max',
      c: ['2', '4'],
      restricciones: [
        { coef: ['1', '2'], rel: '<=', b: '4' },
        { coef: ['1', '1'], rel: '<=', b: '3' },
      ],
    },
  },
  {
    id: 'no-acotado',
    nombre: 'No acotado',
    descripcion: 'La columna que entra no tiene elementos positivos: z puede crecer sin límite.',
    input: {
      sentido: 'max',
      c: ['1', '1'],
      restricciones: [
        { coef: ['1', '-1'], rel: '<=', b: '1' },
        { coef: ['-1', '1'], rel: '<=', b: '2' },
      ],
    },
  },
  {
    id: 'infactible',
    nombre: 'Infactible',
    descripcion:
      'Las restricciones son incompatibles: el Símplex Dual detecta una fila con b < 0 sin coeficientes negativos.',
    input: {
      sentido: 'max',
      c: ['1', '1'],
      restricciones: [
        { coef: ['1', '1'], rel: '<=', b: '1' },
        { coef: ['1', '1'], rel: '>=', b: '3' },
      ],
    },
  },
]
