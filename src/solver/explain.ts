import { formatFrac, type Frac } from './fraction'
import type { Convencion, Explicacion, Metodo, Pivote, Snapshot } from './types'
import type { Analisis } from './tableau'

const f = (v: Frac): string => formatFrac(v)

function listarSolucion(
  x: readonly Frac[],
  varNames: readonly string[],
  nDecision: number,
): string {
  return x
    .slice(0, nDecision)
    .map((v, j) => `${varNames[j]} = ${f(v)}`)
    .join(', ')
}

export function explicarInicial(
  varNames: readonly string[],
  basis: readonly number[],
  an: Analisis,
  conv: Convencion,
): Explicacion {
  const basicas = basis.map((c) => varNames[c]).join(', ')
  const parrafos = [
    `Tabla inicial. Variables básicas: ${basicas} (coeficiente 0 en el renglón z y columnas de la identidad). Las demás son no básicas y valen 0.`,
    `Renglón z en convención ${conv === 'max' ? 'de maximización (z − c·x = 0, se escriben −c_j)' : 'de minimización (criterio del Símplex Dual)'}. Valor actual z = ${f(an.z)}.`,
  ]
  if (!an.factible) {
    parrafos.push(
      `Hay términos independientes negativos (${an.xB
        .map((v, i) => (v.compare(0) < 0 ? `${varNames[basis[i]!]} = ${f(v)}` : null))
        .filter(Boolean)
        .join(', ')}): la solución básica inicial no es factible.`,
    )
  }
  return { titulo: 'Tabla inicial', parrafos }
}

export function explicarPivotePrimal(
  p: Pivote,
  varNames: readonly string[],
  tableau: readonly Frac[][],
  basis: readonly number[],
): Explicacion {
  const filaZ = tableau[0]!
  const nVars = filaZ.length - 1
  const entra = varNames[p.entra]!
  const sale = varNames[p.sale]!
  const parrafos: string[] = []
  const otros = p.candidatos
    .filter((j) => j !== p.entra)
    .map((j) => `${varNames[j]} (${f(filaZ[j]!)})`)
  parrafos.push(
    `Entra ${entra} porque tiene el coeficiente más negativo del renglón z (${f(filaZ[p.entra]!)})${otros.length ? `; también eran candidatas ${otros.join(', ')}` : ''}. Al aumentar ${entra} desde 0, z crece.`,
  )
  const cocTxt = p.cocientes
    .map((c) => {
      const nombre = varNames[basis[c.indice - 1]!]
      if (!c.elegible)
        return `${nombre}: a_ie = ${f(tableau[c.indice]![p.col]!)} ≤ 0, no limita (se tacha)`
      return `${nombre}: ${f(tableau[c.indice]![nVars]!)} / ${f(tableau[c.indice]![p.col]!)} = ${f(c.valor!)}${c.minimo ? ' ← mínimo' : ''}`
    })
    .join('; ')
  parrafos.push(`Cocientes b_i / a_ie: ${cocTxt}.`)
  if (p.empates.length > 1) {
    const nombres = p.empates.map((i) => varNames[basis[i - 1]!]).join(' y ')
    parrafos.push(
      `Empate en el cociente mínimo entre ${nombres}. Se aplica la regla de Bland: sale la variable básica de menor índice, ${sale}. La solución siguiente será degenerada (la otra variable empatada seguirá en la base con valor 0) y existe riesgo de ciclado.`,
    )
  } else {
    parrafos.push(
      `Sale ${sale} porque su cociente ${f(p.cocientes.find((c) => c.minimo)!.valor!)} es el mínimo: es la primera variable básica que llegaría a 0.`,
    )
  }
  parrafos.push(
    `Elemento pivote: a_${p.fila}${p.col + 1} = ${f(tableau[p.fila]![p.col]!)} (fila de ${sale}, columna de ${entra}).`,
  )
  return { titulo: `Entra ${entra}, sale ${sale} (Símplex)`, parrafos }
}

export function explicarPivoteDual(
  p: Pivote,
  varNames: readonly string[],
  tableau: readonly Frac[][],
  basis: readonly number[],
  zOptimo: boolean,
): Explicacion {
  const filaZ = tableau[0]!
  const nVars = filaZ.length - 1
  const entra = varNames[p.entra]!
  const sale = varNames[p.sale]!
  const parrafos: string[] = []
  const intro = zOptimo
    ? 'El renglón z ya es óptimo (ningún coeficiente positivo en convención min), pero hay b_i < 0: la solución no es factible, así que se usa el Símplex Dual. '
    : 'Hay b_i < 0 (solución no factible) y el renglón z todavía no es óptimo: se aplica el Símplex Dual para alcanzar la factibilidad y después se continuará con el Símplex estándar. '
  const otros = p.candidatos
    .filter((i) => i !== p.fila)
    .map((i) => `${varNames[basis[i - 1]!]} (${f(tableau[i]![nVars]!)})`)
  parrafos.push(
    `${intro}Sale ${sale} porque su b = ${f(tableau[p.fila]![nVars]!)} es el más negativo${otros.length ? ` (también negativos: ${otros.join(', ')})` : ''}.`,
  )
  const cocTxt = p.cocientes
    .map((c) => {
      const nombre = varNames[c.indice]
      if (!c.elegible) return `${nombre}: a_rj = ${f(tableau[p.fila]![c.indice]!)} ≥ 0, no elegible`
      return `${nombre}: |${f(filaZ[c.indice]!)}| / |${f(tableau[p.fila]![c.indice]!)}| = ${f(c.valor!)}${c.minimo ? ' ← mínimo' : ''}`
    })
    .join('; ')
  parrafos.push(
    `Cocientes |z_j / a_rj| sobre las columnas con a_rj < 0 de la fila de ${sale}: ${cocTxt}.`,
  )
  if (p.empates.length > 1) {
    parrafos.push(
      `Empate entre ${p.empates.map((j) => varNames[j]).join(' y ')}: entra la de menor índice, ${entra}.`,
    )
  } else {
    parrafos.push(
      `Entra ${entra} porque su cociente es el mínimo: así el renglón z sigue siendo óptimo tras el pivote.`,
    )
  }
  parrafos.push(`Elemento pivote: a_${p.fila}${p.col + 1} = ${f(tableau[p.fila]![p.col]!)}.`)
  return { titulo: `Sale ${sale}, entra ${entra} (Símplex Dual)`, parrafos }
}

export function explicarOptimo(
  varNames: readonly string[],
  basis: readonly number[],
  an: Analisis,
  nDecision: number,
  conv: Convencion,
  preciosSombra: readonly Frac[],
  optimosAlternativosCols: readonly number[],
): Explicacion {
  const parrafos = [
    `Óptimo: ${conv === 'max' ? 'ningún coeficiente negativo' : 'ningún coeficiente positivo'} en el renglón z para las variables no básicas, y todos los b_i ≥ 0. Ninguna variable no básica mejora z al entrar.`,
    `Solución: ${listarSolucion(an.x, varNames, nDecision)}; z* = ${f(an.zOriginal)}${an.zOriginal.equals(an.z) ? '' : ` (en la tabla aparece ${f(an.z)} por el cambio de signo de la función objetivo)`}.`,
    `Precios sombra (variables duales) leídos del renglón z en las columnas de holgura, y_i = c_Bᵀ B⁻¹: ${preciosSombra.map((v, i) => `restricción ${i + 1}: ${f(v)}`).join(', ')}.`,
  ]
  if (optimosAlternativosCols.length > 0) {
    parrafos.push(
      `Óptimos alternativos: ${optimosAlternativosCols.map((j) => varNames[j]).join(', ')} ${optimosAlternativosCols.length > 1 ? 'son no básicas' : 'es no básica'} con coeficiente 0 en el renglón z; al entrar en la base z no cambia y se obtiene otro vértice óptimo.`,
    )
  }
  if (an.filasDegeneradas.length > 0) {
    parrafos.push(
      `La solución óptima es degenerada: ${an.filasDegeneradas.map((i) => varNames[basis[i - 1]!]).join(', ')} ${an.filasDegeneradas.length > 1 ? 'son básicas' : 'es básica'} con valor 0.`,
    )
  }
  return { titulo: 'Solución óptima', parrafos }
}

export function explicarNoAcotado(
  col: number,
  varNames: readonly string[],
  tableau: readonly Frac[][],
): Explicacion {
  return {
    titulo: 'Problema no acotado',
    parrafos: [
      `${varNames[col]} debería entrar (coeficiente ${f(tableau[0]![col]!)} en el renglón z), pero su columna no tiene ningún elemento positivo: ninguna variable básica limita su crecimiento. ${varNames[col]} puede crecer indefinidamente manteniendo la factibilidad y z → ∞. El problema no está acotado.`,
    ],
  }
}

export function explicarInfactible(
  fila: number,
  varNames: readonly string[],
  basis: readonly number[],
  tableau: readonly Frac[][],
): Explicacion {
  const nVars = tableau[0]!.length - 1
  return {
    titulo: 'Problema infactible',
    parrafos: [
      `La fila de ${varNames[basis[fila - 1]!]} tiene b = ${f(tableau[fila]![nVars]!)} < 0 y ningún coeficiente negativo, así que la ecuación no puede satisfacerse con variables ≥ 0. El Símplex Dual no puede continuar: la región factible es vacía.`,
    ],
  }
}

export function explicarInversion(de: Convencion, a: Convencion, siguiente: Metodo): Explicacion {
  const motivo =
    siguiente === 'dual'
      ? 'El Símplex Dual de los apuntes se aplica a un problema de minimización: '
      : 'Ya se ha alcanzado una solución factible (b ≥ 0) pero no es óptima; se vuelve al Símplex estándar, que trabaja en maximización: '
  return {
    titulo: `Inversión de la función objetivo (${de} → ${a})`,
    parrafos: [
      `${motivo}se multiplica el renglón z por −1 (equivale a cambiar z por −z). Las filas de las restricciones no cambian.`,
    ],
  }
}

export function explicarBloqueo(motivo: string): Explicacion {
  return { titulo: 'No se puede continuar', parrafos: [motivo] }
}

export function resumen(s: Snapshot): string {
  return `${s.explicacion.titulo}: ${s.explicacion.parrafos.join(' ')}`
}
