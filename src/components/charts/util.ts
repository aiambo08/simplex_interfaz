export const PALETA = [
  '#0369a1',
  '#b45309',
  '#15803d',
  '#7e22ce',
  '#be123c',
  '#0f766e',
  '#4d7c0f',
  '#c2410c',
  '#1d4ed8',
  '#9f1239',
]

export function pasoTicks(rango: number, n = 5): number {
  if (!(rango > 0)) return 1
  const bruto = rango / n
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const m = bruto / pot
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pot
}

export function ticksEntre(min: number, max: number, n = 5): number[] {
  const paso = pasoTicks(max - min, n)
  const ini = Math.ceil(min / paso) * paso
  const out: number[] = []
  for (let t = ini; t <= max + 1e-9; t += paso) out.push(+t.toFixed(10))
  return out
}

export function colorVar(j: number): string {
  return PALETA[j % PALETA.length]!
}

export const redondear = (v: number) => +v.toFixed(4)
