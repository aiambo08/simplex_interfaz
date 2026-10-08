import { formatFrac, toNumber, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'
import { colorVar, ticksEntre } from './util'

interface Props {
  snapshots: readonly Snapshot[]
  k: number
}

const W = 420
const H = 240
const M = { izq: 48, der: 16, sup: 12, inf: 48 }

export function VariablesBasicas({ snapshots, k }: Props) {
  const { modo } = useFormato()
  const varNames = snapshots[0]?.varNames ?? []
  const valores = snapshots.flatMap((s) => s.xB.map(toNumber))
  const yMin = Math.min(0, ...valores)
  const yMax = Math.max(0, ...valores)
  const rango = yMax - yMin || 1
  const n = snapshots.length
  const anchoPlot = W - M.izq - M.der
  const altoPlot = H - M.sup - M.inf
  const anchoGrupo = anchoPlot / n
  const sy = (v: number) => M.sup + altoPlot - ((v - yMin) / rango) * altoPlot
  const ticks = ticksEntre(yMin, yMax)

  return (
    <section
      aria-label="Variables básicas por iteración"
      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
    >
      <h4 className="mb-1 text-sm font-semibold">Valores de las variables básicas por iteración</h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Barras agrupadas por iteración con el valor de cada variable básica"
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
        {snapshots.map((s, i) => {
          const m = s.basis.length
          const anchoBarra = (anchoGrupo * 0.8) / m
          const x0 = M.izq + i * anchoGrupo + anchoGrupo * 0.1
          return (
            <g key={i} data-testid={`grupo-iteracion-${i}`} opacity={i === k ? 1 : 0.45}>
              {i === k && (
                <rect
                  x={M.izq + i * anchoGrupo}
                  y={M.sup}
                  width={anchoGrupo}
                  height={altoPlot}
                  fill="currentColor"
                  opacity={0.08}
                />
              )}
              {s.basis.map((j, fila) => {
                const v = toNumber(s.xB[fila]!)
                const y1 = sy(Math.max(0, v))
                const y2 = sy(Math.min(0, v))
                return (
                  <rect
                    key={j}
                    x={x0 + fila * anchoBarra}
                    y={y1}
                    width={Math.max(1, anchoBarra - 1)}
                    height={Math.max(0.5, y2 - y1)}
                    fill={colorVar(j)}
                  >
                    <title>
                      k = {i}: {varNames[j]} = {formatFrac(s.xB[fila]!, modo)}
                    </title>
                  </rect>
                )
              })}
              <text
                x={M.izq + (i + 0.5) * anchoGrupo}
                y={H - M.inf + 14}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                fontWeight={i === k ? 700 : 400}
              >
                {i}
              </text>
            </g>
          )
        })}
        <text x={W - M.der} y={H - M.inf + 30} textAnchor="end" fontSize={11} fill="currentColor">
          iteración k
        </text>
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Leyenda de variables">
        {varNames.map((nombre, j) => (
          <span key={nombre} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: colorVar(j) }}
              aria-hidden="true"
            />
            {nombre}
          </span>
        ))}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Iteración {k}:{' '}
        {snapshots[k]!.basis.map(
          (j, f) => `${varNames[j]} = ${formatFrac(snapshots[k]!.xB[f]!, modo)}`,
        ).join(', ')}
        . Las variables no básicas valen 0.
      </p>
    </section>
  )
}
