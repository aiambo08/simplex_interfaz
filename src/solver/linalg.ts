import { ONE, ZERO, type Frac } from './fraction'

export function identidad(n: number): Frac[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO)),
  )
}

export function clonar(M: readonly Frac[][]): Frac[][] {
  return M.map((fila) => [...fila])
}

export function columna(M: readonly Frac[][], j: number): Frac[] {
  return M.map((fila) => fila[j]!)
}

export function producto(a: readonly Frac[], b: readonly Frac[]): Frac {
  return a.reduce((acc, v, i) => acc.add(v.mul(b[i]!)), ZERO)
}

/** v (1×n) · M (n×p) */
export function vectorPorMatriz(v: readonly Frac[], M: readonly Frac[][]): Frac[] {
  const p = M[0]?.length ?? 0
  return Array.from({ length: p }, (_, j) => producto(v, columna(M, j)))
}

/** M (m×n) · v (n×1) */
export function matrizPorVector(M: readonly Frac[][], v: readonly Frac[]): Frac[] {
  return M.map((fila) => producto(fila, v))
}

export function matrizPorMatriz(A: readonly Frac[][], B: readonly Frac[][]): Frac[][] {
  return A.map((fila) => vectorPorMatriz(fila, B))
}

/** Inversa exacta por Gauss-Jordan. Devuelve null si la matriz es singular. */
export function invertir(M: readonly Frac[][]): Frac[][] | null {
  const n = M.length
  if (M.some((fila) => fila.length !== n)) return null
  const aug = M.map((fila, i) => [...fila, ...identidad(n)[i]!])
  for (let col = 0; col < n; col++) {
    let piv = -1
    for (let r = col; r < n; r++) {
      if (!aug[r]![col]!.equals(0)) {
        piv = r
        break
      }
    }
    if (piv === -1) return null
    if (piv !== col) {
      const tmp = aug[piv]!
      aug[piv] = aug[col]!
      aug[col] = tmp
    }
    const d = aug[col]![col]!
    aug[col] = aug[col]!.map((v) => v.div(d))
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = aug[r]![col]!
      if (f.equals(0)) continue
      aug[r] = aug[r]!.map((v, j) => v.sub(f.mul(aug[col]![j]!)))
    }
  }
  return aug.map((fila) => fila.slice(n))
}
