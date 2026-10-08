import { formatFrac, toNumber, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'
import { ticksEntre } from './util'

interface Props {
  snapshots: readonly Snapshot[]
  k: number
  irA: (k: number) => void
}

const W = 420
const H = 220
const M = { izq: 56, der: 16, sup: 16, inf: 32 }

export function EvolucionZ({ snapshots, k, irA }: Props) {
  const { modo } = useFormato()
  const zs = snapshots.map((s) => toNumber(s.zOriginal))
  const yMin = Math.min(0, ...zs)
  const yMax = Math.max(0, ...zs)
  const rango = yMax - yMin || 1
  const n = snapshots.length
  const anchoPlot = W - M.izq - M.der
  const altoPlot = H - M.sup - M.inf
  const sx = (i: number) => M.izq + (n > 1 ? (i / (n - 1)) * anchoPlot : anchoPlot / 2)
  const sy = (z: number) => M.sup + altoPlot - ((z - yMin) / rango) * altoPlot
  const ticks = ticksEntre(yMin, yMax)
  const puntos = zs.map((z, i) => `${sx(i)},${sy(z)}`).join(' ')

  return (
    <section
      aria-label="Evolución de z"
      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
    >
      <h4 className="mb-1 text-sm font-semibold">Evolución de z por iteración</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`z por iteración: ${zs.map((_, i) => `k=${i} z=${formatFrac(snapshots[i]!.zOriginal, modo)}`).join(', ')}`}
        className="h-auto w-full text-slate-700 dark:text-slate-300"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.izq}
              x2={W - M.der}
              y1={sy(t)}
              y2={sy(t)}
              stroke="currentColor"
              opacity={t === 0 ? 0.6 : 0.15}
            />
            <text x={M.izq - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="currentColor">
              {+t.toFixed(6)}
            </text>
          </g>
        ))}
        <polyline points={puntos} fill="none" stroke="#1d4ed8" strokeWidth={2} />
        {snapshots.map((s, i) => (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`Ir a la iteración ${i}, z = ${formatFrac(s.zOriginal, modo)}`}
            aria-pressed={i === k}
            onClick={() => irA(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                irA(i)
              }
            }}
            className="cursor-pointer"
          >
            <circle
              cx={sx(i)}
              cy={sy(zs[i]!)}
              r={i === k ? 7 : 4.5}
              fill={i === k ? '#1d4ed8' : 'white'}
              stroke="#1d4ed8"
              strokeWidth={2}
            />
            <text
              x={sx(i)}
              y={H - M.inf + 16}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              fontWeight={i === k ? 700 : 400}
            >
              {i}
            </text>
            <text
              x={sx(i)}
              y={sy(zs[i]!) - 10}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
            >
              {formatFrac(s.zOriginal, modo)}
            </text>
          </g>
        ))}
        <text x={W - M.der} y={H - 4} textAnchor="end" fontSize={11} fill="currentColor">
          iteración k
        </text>
      </svg>
    </section>
  )
}
