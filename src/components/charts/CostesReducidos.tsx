import { formatFrac, toNumber, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'
import { ticksEntre } from './util'

interface Props {
  snapshot: Snapshot
}

const W = 420
const H = 220
const M = { izq: 48, der: 16, sup: 16, inf: 40 }

export function CostesReducidos({ snapshot: s }: Props) {
  const { modo } = useFormato()
  const fila = s.tableau[0]!
  const costes = s.varNames.map((_, j) => fila[j]!)
  const vals = costes.map(toNumber)
  const yMin = Math.min(0, ...vals)
  const yMax = Math.max(0, ...vals)
  const rango = yMax - yMin || 1
  const n = costes.length
  const anchoPlot = W - M.izq - M.der
  const altoPlot = H - M.sup - M.inf
  const anchoGrupo = anchoPlot / n
  const sy = (v: number) => M.sup + altoPlot - ((v - yMin) / rango) * altoPlot
  const ticks = ticksEntre(yMin, yMax)
  const entra = s.pivote?.metodo === 'primal' ? s.pivote.entra : undefined
  const noAcotada = s.flags.colNoAcotada

  return (
    <section
      aria-label="Costes reducidos"
      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
    >
      <h4 className="mb-1 text-sm font-semibold">
        Renglón z (costes reducidos) en la iteración {s.k}
      </h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Costes reducidos: ${s.varNames.map((v, j) => `${v} = ${formatFrac(costes[j]!, modo)}`).join(', ')}`}
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
        {costes.map((c, j) => {
          const v = vals[j]!
          const esEntra = j === entra || j === noAcotada
          const basica = s.basis.includes(j)
          const x = M.izq + j * anchoGrupo + anchoGrupo * 0.2
          const y1 = sy(Math.max(0, v))
          const y2 = sy(Math.min(0, v))
          return (
            <g key={j} data-testid={esEntra ? 'coste-entra' : 'coste'}>
              <rect
                x={x}
                y={y1}
                width={anchoGrupo * 0.6}
                height={Math.max(0.5, y2 - y1)}
                fill={esEntra ? '#dc2626' : basica ? '#94a3b8' : v < 0 ? '#f59e0b' : '#0369a1'}
                stroke={esEntra ? '#111827' : 'none'}
                strokeWidth={1.5}
              >
                <title>
                  {s.varNames[j]}: {formatFrac(c, modo)}
                  {esEntra ? ' (entra)' : basica ? ' (básica)' : ''}
                </title>
              </rect>
              <text
                x={x + anchoGrupo * 0.3}
                y={H - M.inf + 14}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                fontWeight={esEntra ? 700 : 400}
              >
                {s.varNames[j]}
              </text>
              {esEntra && (
                <text
                  x={x + anchoGrupo * 0.3}
                  y={H - M.inf + 28}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#dc2626"
                  fontWeight={700}
                >
                  ↑ entra
                </text>
              )}
              <text
                x={x + anchoGrupo * 0.3}
                data-testid="valor-coste"
                y={y1 - 4}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
              >
                {formatFrac(c, modo)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Convención {s.convencionZ}:{' '}
        {s.convencionZ === 'max'
          ? 'entra la variable con coeficiente más negativo; óptimo cuando todos son ≥ 0.'
          : 'óptimo cuando todos son ≤ 0.'}{' '}
        {entra !== undefined && `Entra ${s.varNames[entra]}.`}
        {noAcotada !== undefined &&
          ` ${s.varNames[noAcotada]} debería entrar pero su columna no limita: no acotado.`}
        {s.pivote?.metodo === 'dual' &&
          ' En el Símplex Dual la variable que entra se decide por cocientes |z_j / a_rj|, no por el renglón z solo.'}
      </p>
    </section>
  )
}
