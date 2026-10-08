import { formatFrac, isZero, type Frac, type ModoFormato } from '../../solver'

/** "3x1 + 5x2 − 1/2x3" a partir de coeficientes y nombres (omite los ceros). */
export function lineal(
  coef: readonly Frac[],
  nombres: readonly string[],
  modo: ModoFormato = 'fraccion',
): string {
  const partes: string[] = []
  coef.forEach((c, j) => {
    if (isZero(c)) return
    const abs = c.abs()
    const mag = abs.equals(1) ? '' : formatFrac(abs, modo)
    const termino = `${mag}${nombres[j] ?? `x${j + 1}`}`
    if (partes.length === 0) partes.push(c.compare(0) < 0 ? `−${termino}` : termino)
    else partes.push(`${c.compare(0) < 0 ? '−' : '+'} ${termino}`)
  })
  return partes.length ? partes.join(' ') : '0'
}
