import type { Frac } from './fraction'

export type Sentido = 'max' | 'min'
export type Relacion = '<=' | '>=' | '='
export type SignoVariable = '>=0' | '<=0' | 'libre'

export interface Restriccion {
  coef: Frac[]
  rel: Relacion
  b: Frac
}

/** Problema de PL tal y como lo escribe el usuario. */
export interface Problem {
  sentido: Sentido
  c: Frac[]
  restricciones: Restriccion[]
  nombresVars: string[]
  /** Signo de cada variable; por defecto todas son ≥ 0. Solo se usa en el problema dual. */
  signosVars?: SignoVariable[]
}

export type TipoVariable = 'decision' | 'holgura' | 'superavit'

/** Forma estándar: max, restricciones de igualdad con holguras/superávit, x ≥ 0. */
export interface StandardForm {
  original: Problem
  /** Costes (en maximización) de todas las columnas, incluidas holguras. */
  c: Frac[]
  A: Frac[][]
  b: Frac[]
  varNames: string[]
  tiposVar: TipoVariable[]
  nDecision: number
  m: number
  /** z_original = signoZ · z. Vale −1 si el problema original era de minimización. */
  signoZ: 1 | -1
  /** Fila i multiplicada por −1 (restricción ≥ convertida en ≤ con b < 0). */
  filasMultiplicadas: boolean[]
  /** Columna básica inicial de cada fila (su variable de holgura o superávit). */
  baseInicial: number[]
  /** Explicación textual de cada paso de la conversión. */
  notas: string[]
}

/** Tabla Símplex inicial lista para iterar (renglón z en la fila 0, b en la última columna). */
export interface InitialTableau {
  tableau: Frac[][]
  varNames: string[]
  basis: number[]
  nDecision: number
  signoZ: 1 | -1
  filasMultiplicadas: boolean[]
  /** Costes originales de cada columna (= −renglón z inicial). */
  c: Frac[]
}

export type Metodo = 'primal' | 'dual'
/** Convención del renglón z: el Símplex estándar trabaja en max y el Símplex Dual en min. */
export type Convencion = 'max' | 'min'
export type MetodoSeleccion = Metodo | 'auto'
export type Estado = 'continua' | 'optimo' | 'no_acotado' | 'infactible' | 'bloqueado'
export type ReglaEntrada = 'dantzig' | 'bland'

/** Cociente del criterio de salida (primal: por fila b_i/a_ie; dual: por columna z_j/|a_rj|). */
export interface Cociente {
  indice: number
  valor: Frac | null
  elegible: boolean
  minimo: boolean
}

export interface Pivote {
  metodo: Metodo
  /** Columna de la variable que entra. */
  entra: number
  /** Columna de la variable que sale. */
  sale: number
  /** Fila pivote (1..m). */
  fila: number
  /** Columna pivote. */
  col: number
  cocientes: Cociente[]
  /** Índices (filas en primal, columnas en dual) empatados en el cociente mínimo. */
  empates: number[]
  desempatePorBland: boolean
  /** Columnas candidatas a entrar (primal) o filas candidatas a salir (dual). */
  candidatos: number[]
}

/** F_fila ← F_fila − factor · F_pivote */
export interface OperacionFila {
  fila: number
  factor: Frac
  filaPivote: number
}

export interface OperacionesPivote {
  fila: number
  col: number
  /** F_pivote ← F_pivote / divisor */
  divisor: Frac
  eliminaciones: OperacionFila[]
}

export interface Comprobacion {
  /** Columnas de la base inicial (holguras), donde la tabla muestra B⁻¹ y c_Bᵀ B⁻¹. */
  columnasBase: number[]
  BinvCoincide: boolean
  cBBinvCoincide: boolean
}

export interface Explicacion {
  titulo: string
  parrafos: string[]
}

export interface Flags {
  degenerado: boolean
  filasDegeneradas: number[]
  empateFilas: number[]
  optimosAlternativosCols: number[]
  colNoAcotada?: number
  filaInfactible?: number
  motivoBloqueo?: string
}

/** Estado inmutable de una iteración. El snapshot k es la tabla tras k pivotes y la decisión tomada desde ella. */
export interface Snapshot {
  /** Índice del snapshot (0 = tabla inicial). */
  k: number
  /** Pivotes realizados hasta esta tabla (las inversiones de z no cuentan). */
  pivotesRealizados: number
  convencionZ: Convencion
  tableau: Frac[][]
  varNames: string[]
  basis: number[]
  xB: Frac[]
  x: Frac[]
  z: Frac
  zOriginal: Frac
  cB: Frac[]
  Binv: Frac[][]
  cBBinv: Frac[]
  comprobacion: Comprobacion
  factible: boolean
  dualFactible: boolean
  estado: Estado
  flags: Flags
  pivote?: Pivote
  /** Operaciones elementales que produjeron esta tabla a partir de la anterior (ausente en k = 0). */
  operaciones?: OperacionesPivote
  /** Presente si esta tabla se obtuvo invirtiendo el renglón z para cambiar de convención. */
  cambioConvencion?: { de: Convencion; a: Convencion }
  /** Método que se aplicará desde esta tabla (si hay pivote) o que se acaba de usar. */
  metodo?: Metodo
  explicacion: Explicacion
}

export interface OpcionesRun {
  metodo?: MetodoSeleccion
  reglaEntrada?: ReglaEntrada
  maxIteraciones?: number
}

export interface Solucion {
  x: Frac[]
  xDecision: Frac[]
  z: Frac
  zOriginal: Frac
  /** Precio sombra de cada restricción original (∂z_original/∂b_i). */
  preciosSombra: Frac[]
  optimosAlternativosCols: number[]
}

export interface RunResult {
  problem?: Problem
  standard?: StandardForm
  inicial: InitialTableau
  snapshots: Snapshot[]
  estadoFinal: Estado
  metodosUsados: Metodo[]
  solucion?: Solucion
  opciones: Required<OpcionesRun>
}
