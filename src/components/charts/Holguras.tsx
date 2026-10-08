import { formatFrac, toNumber, type Frac, type Problem, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'

interface Props {
  problem: Problem
  snapshot: Snapshot
}

export function Holguras({ problem, snapshot: s }: Props) {
  const { modo } = useFormato()
  const n = problem.nombresVars.length
  const filas = problem.restricciones.map((r, i) => {
    const usado = r.coef.reduce<Frac>((acc, c, j) => acc.add(c.mul(s.x[j]!)), s.x[0]!.mul(0))
    const holgura = r.rel === '>=' ? usado.sub(r.b) : r.b.sub(usado)
    return { id: `R${i + 1}`, rel: r.rel, b: r.b, usado, holgura, nombreHolgura: s.varNames[n + i] }
  })
  const escala = Math.max(
    1e-9,
    ...filas.flatMap((f) => [Math.abs(toNumber(f.usado)), Math.abs(toNumber(f.b))]),
  )
  const W = 420
  const altoFila = 40
  const H = filas.length * altoFila + 16
  const M = { izq: 44, der: 16 }
  const anchoPlot = W - M.izq - M.der
  const sx = (v: number) => M.izq + (Math.max(0, v) / escala) * anchoPlot

  return (
    <section
      aria-label="Holguras por restricción"
      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
    >
      <h4 className="mb-1 text-sm font-semibold">
        Recursos usados frente a disponibles (iteración {s.k})
      </h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Holguras: ${filas.map((f) => `${f.id} usado ${formatFrac(f.usado, modo)} de ${formatFrac(f.b, modo)}`).join('; ')}`}
        className="h-auto w-full text-slate-700 dark:text-slate-300"
      >
        {filas.map((f, i) => {
          const y = 8 + i * altoFila
          const usado = toNumber(f.usado)
          const b = toNumber(f.b)
          const violada = toNumber(f.holgura) < 0
          return (
            <g key={f.id} data-testid={`holgura-${f.id}`}>
              <text
                x={M.izq - 6}
                y={y + 20}
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                fill="currentColor"
              >
                {f.id}
              </text>
              <rect
                x={M.izq}
                y={y + 4}
                width={sx(b) - M.izq}
                height={12}
                fill="currentColor"
                opacity={0.15}
              />
              <rect
                x={M.izq}
                y={y + 4}
                width={Math.max(0, sx(usado) - M.izq)}
                height={12}
                fill={violada ? '#dc2626' : f.rel === '>=' ? '#15803d' : '#0369a1'}
              >
                <title>
                  {f.id}: usado {formatFrac(f.usado, modo)} {f.rel} {formatFrac(f.b, modo)};{' '}
                  {f.nombreHolgura} = {formatFrac(f.holgura, modo)}
                </title>
              </rect>
              <line
                x1={sx(b)}
                x2={sx(b)}
                y1={y}
                y2={y + 20}
                stroke="currentColor"
                strokeWidth={2}
              />
              <text x={M.izq} y={y + 32} fontSize={11} fill="currentColor">
                usado {formatFrac(f.usado, modo)} {f.rel === '>=' ? '≥' : '≤'}{' '}
                {formatFrac(f.b, modo)} {f.rel === '>=' ? 'requerido' : 'disponible'} ·{' '}
                {f.nombreHolgura} = {formatFrac(f.holgura, modo)}
                {violada
                  ? ' (violada: punto no factible)'
                  : toNumber(f.holgura) === 0
                    ? ' (activa)'
                    : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
