import { useMemo, useState } from 'react'
import {
  direccionNoAcotada,
  geometria2D,
  restriccionesActivas,
  type Recta,
} from '../../geometry/region2d'
import { formatFrac, toNumber, type Problem, type Relacion, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'

interface Props {
  problem: Problem
  snapshots: readonly Snapshot[]
  k: number
}

const W = 560
const H = 460
const M = { izq: 48, der: 16, sup: 16, inf: 40 }
const COLORES_RECTAS = ['#0369a1', '#b45309', '#15803d', '#7e22ce', '#be123c', '#0f766e']
type P = [number, number]

/** Recorta el rectángulo [0,xMax]×[0,yMax] con el semiplano a·x (rel) b (Sutherland–Hodgman, floats). */
function recortarSemiplano(poli: P[], a: P, b: number, rel: Relacion): P[] {
  const dentro = (p: P) => {
    const v = a[0] * p[0] + a[1] * p[1]
    return rel === '<=' ? v <= b + 1e-9 : rel === '>=' ? v >= b - 1e-9 : Math.abs(v - b) < 1e-9
  }
  const salida: P[] = []
  for (let i = 0; i < poli.length; i++) {
    const p = poli[i]!
    const q = poli[(i + 1) % poli.length]!
    const dp = dentro(p)
    const dq = dentro(q)
    if (dp) salida.push(p)
    if (dp !== dq) {
      const fp = a[0] * p[0] + a[1] * p[1] - b
      const fq = a[0] * q[0] + a[1] * q[1] - b
      const t = fp / (fp - fq)
      salida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
    }
  }
  return salida
}

/** Segmento de la recta a·x = b dentro del rectángulo [0,xMax]×[0,yMax] (Liang–Barsky). */
function segmentoEnCaja(a: P, b: number, xMax: number, yMax: number): [P, P] | null {
  if (Math.abs(a[0]) < 1e-12 && Math.abs(a[1]) < 1e-12) return null
  const p0: P = Math.abs(a[1]) > 1e-12 ? [0, b / a[1]] : [b / a[0], 0]
  const d: P = [-a[1], a[0]]
  let t0 = -Infinity
  let t1 = Infinity
  const limites: [number, number][] = [
    [-d[0], p0[0]],
    [d[0], xMax - p0[0]],
    [-d[1], p0[1]],
    [d[1], yMax - p0[1]],
  ]
  for (const [den, numr] of limites) {
    if (Math.abs(den) < 1e-12) {
      if (numr < -1e-9) return null
      continue
    }
    const t = numr / den
    if (den < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
  }
  if (!(t1 - t0 > 1e-9)) return null
  return [
    [p0[0] + t0 * d[0], p0[1] + t0 * d[1]],
    [p0[0] + t1 * d[0], p0[1] + t1 * d[1]],
  ]
}

function pasoTicks(max: number): number {
  const bruto = max / 6
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const m = bruto / pot
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pot
}

export function RegionFactible2D({ problem, snapshots, k }: Props) {
  const { modo } = useFormato()
  const [verNoFactibles, setVerNoFactibles] = useState(false)
  const [desplazamiento, setDesplazamiento] = useState(0)
  const geo = useMemo(() => geometria2D(problem, snapshots), [problem, snapshots])
  const s = snapshots[k]
  if (!geo || !s) return null

  const { xMax, yMax } = geo.limites
  const anchoPlot = W - M.izq - M.der
  const altoPlot = H - M.sup - M.inf
  const sx = (x: number) => M.izq + (x / xMax) * anchoPlot
  const sy = (y: number) => M.sup + altoPlot - (y / yMax) * altoPlot
  const num = (p: readonly [import('../../solver').Frac, import('../../solver').Frac]): P => [
    toNumber(p[0]),
    toNumber(p[1]),
  ]
  const caja: P[] = [
    [0, 0],
    [xMax, 0],
    [xMax, yMax],
    [0, yMax],
  ]
  const [n1, n2] = problem.nombresVars as [string, string]
  const actual = geo.trayectoria[k]!
  const pActual = num(actual.x)
  const c: P = [toNumber(problem.c[0]!), toNumber(problem.c[1]!)]
  const zNivel = toNumber(actual.z) + desplazamiento
  const nivel = segmentoEnCaja(c, zNivel, xMax, yMax)
  const grad = num(geo.gradiente)
  const normaGrad = Math.hypot(grad[0], grad[1]) || 1
  const longFlecha = 60
  const gradFin: P = [
    sx(pActual[0]) + (grad[0] / normaGrad) * longFlecha,
    sy(pActual[1]) - (grad[1] / normaGrad) * longFlecha,
  ]
  const escalaZ = Math.max(1, Math.abs(c[0]) * xMax + Math.abs(c[1]) * yMax)
  const dirNoAcotada = s.estado === 'no_acotado' ? direccionNoAcotada(s) : null
  const activas = restriccionesActivas(problem, s)
  const ticksX = Array.from(
    { length: Math.floor(xMax / pasoTicks(xMax)) + 1 },
    (_, i) => i * pasoTicks(xMax),
  )
  const ticksY = Array.from(
    { length: Math.floor(yMax / pasoTicks(yMax)) + 1 },
    (_, i) => i * pasoTicks(yMax),
  )
  const colorRecta = (r: Recta) =>
    r.indice >= 0 ? COLORES_RECTAS[r.indice % COLORES_RECTAS.length]! : '#64748b'
  const fmt = (p: readonly [import('../../solver').Frac, import('../../solver').Frac]) =>
    `(${formatFrac(p[0], modo)}, ${formatFrac(p[1], modo)})`

  return (
    <section
      aria-label="Región factible 2D"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <h3 className="mb-2 font-semibold">Región factible y trayectoria del Símplex</h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Región factible en el plano ${n1}-${n2}; iteración ${k} en el punto ${fmt(actual.x)}`}
        className="h-auto w-full max-w-[560px] select-none text-slate-700 dark:text-slate-300"
      >
        <defs>
          <marker
            id="flecha"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          <marker
            id="flecha-grad"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
          </marker>
        </defs>

        {/* semiplanos de cada restricción */}
        {geo.rectas
          .filter((r) => r.indice >= 0)
          .map((r) => {
            const poli = recortarSemiplano(caja, num(r.a), toNumber(r.b), r.rel as Relacion)
            if (poli.length < 3) return null
            return (
              <polygon
                key={`semi-${r.id}`}
                points={poli.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ')}
                fill={colorRecta(r)}
                opacity={0.06}
              />
            )
          })}

        {/* región factible */}
        {geo.poligono.length >= 3 && (
          <polygon
            data-testid="region-factible"
            points={geo.poligono
              .map((p) => `${sx(toNumber(p[0]))},${sy(toNumber(p[1]))}`)
              .join(' ')}
            fill="#0ea5e9"
            opacity={0.25}
            stroke="#0369a1"
            strokeWidth={1.5}
          />
        )}

        {/* ejes y ticks */}
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(xMax)}
          y2={sy(0)}
          stroke="currentColor"
          strokeWidth={1.2}
        />
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(0)}
          y2={sy(yMax)}
          stroke="currentColor"
          strokeWidth={1.2}
        />
        {ticksX.map((t) => (
          <g key={`tx-${t}`}>
            <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(0) + 5} stroke="currentColor" />
            <text x={sx(t)} y={sy(0) + 17} textAnchor="middle" fontSize={11} fill="currentColor">
              {+t.toFixed(6)}
            </text>
          </g>
        ))}
        {ticksY.map((t) => (
          <g key={`ty-${t}`}>
            <line x1={sx(0) - 5} y1={sy(t)} x2={sx(0)} y2={sy(t)} stroke="currentColor" />
            <text x={sx(0) - 8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="currentColor">
              {+t.toFixed(6)}
            </text>
          </g>
        ))}
        <text x={sx(xMax)} y={sy(0) + 32} textAnchor="end" fontSize={13} fill="currentColor">
          {n1}
        </text>
        <text x={sx(0) + 8} y={sy(yMax) + 12} fontSize={13} fill="currentColor">
          {n2}
        </text>

        {/* rectas de las restricciones */}
        {geo.rectas
          .filter((r) => r.indice >= 0)
          .map((r) => {
            const seg = segmentoEnCaja(num(r.a), toNumber(r.b), xMax, yMax)
            if (!seg) return null
            const [p, q] = seg
            const fin = p[0] + p[1] > q[0] + q[1] ? p : q
            return (
              <g key={`recta-${r.id}`} data-testid={`recta-${r.id}`}>
                <line
                  x1={sx(p[0])}
                  y1={sy(p[1])}
                  x2={sx(q[0])}
                  y2={sy(q[1])}
                  stroke={colorRecta(r)}
                  strokeWidth={2}
                />
                <text
                  x={sx(fin[0]) + 4}
                  y={sy(fin[1]) - 4}
                  fontSize={12}
                  fontWeight={600}
                  fill={colorRecta(r)}
                >
                  {r.etiqueta}
                </text>
              </g>
            )
          })}

        {/* vértices */}
        {geo.vertices
          .filter((v) => v.factible || verNoFactibles)
          .map((v) => {
            const p = num(v.x)
            if (p[0] > xMax || p[1] > yMax) return null
            return (
              <circle
                key={`v-${v.rectas.join('-')}`}
                data-testid={v.factible ? 'vertice-factible' : 'vertice-no-factible'}
                cx={sx(p[0])}
                cy={sy(p[1])}
                r={4}
                fill={v.factible ? '#0369a1' : 'none'}
                stroke={v.factible ? '#0369a1' : '#94a3b8'}
                strokeWidth={1.5}
                strokeDasharray={v.factible ? undefined : '2 2'}
              >
                <title>
                  {v.factible ? 'Vértice factible' : 'Intersección no factible'} {fmt(v.x)} —{' '}
                  {v.rectas.join(' ∩ ')}
                </title>
              </circle>
            )
          })}

        {/* trayectoria */}
        {geo.trayectoria.slice(1).map((t, i) => {
          const a = num(geo.trayectoria[i]!.x)
          const b = num(t.x)
          const recorrido = t.k <= k
          return (
            <line
              key={`tr-${t.k}`}
              data-testid="tramo-trayectoria"
              x1={sx(a[0])}
              y1={sy(a[1])}
              x2={sx(b[0])}
              y2={sy(b[1])}
              stroke={recorrido ? '#1d4ed8' : '#94a3b8'}
              strokeWidth={recorrido ? 2.5 : 1.5}
              strokeDasharray={recorrido ? undefined : '4 4'}
              markerEnd="url(#flecha)"
              className={recorrido ? 'text-blue-700' : 'text-slate-400'}
              opacity={a[0] === b[0] && a[1] === b[1] ? 0 : 1}
            />
          )
        })}
        {geo.trayectoria.map((t) => {
          const p = num(t.x)
          const esActual = t.k === k
          return (
            <g key={`pt-${t.k}`} data-testid={esActual ? 'punto-actual' : 'punto-trayectoria'}>
              <circle
                cx={sx(p[0])}
                cy={sy(p[1])}
                r={esActual ? 9 : 7}
                fill={
                  t.factible ? (esActual ? '#1d4ed8' : '#60a5fa') : esActual ? '#b91c1c' : '#fca5a5'
                }
                stroke={esActual ? '#111827' : 'white'}
                strokeWidth={esActual ? 2.5 : 1}
                opacity={t.k <= k ? 1 : 0.45}
              />
              <text
                x={sx(p[0])}
                y={sy(p[1]) + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="white"
              >
                {t.k}
              </text>
              <title>
                Iteración {t.k}: {fmt(t.x)}, z = {formatFrac(t.z, modo)}
                {t.factible ? '' : ' (no factible)'}
              </title>
            </g>
          )
        })}

        {/* recta de nivel y gradiente */}
        {nivel && (
          <line
            data-testid="recta-nivel"
            x1={sx(nivel[0][0])}
            y1={sy(nivel[0][1])}
            x2={sx(nivel[1][0])}
            y2={sy(nivel[1][1])}
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}
        <line
          data-testid="gradiente"
          x1={sx(pActual[0])}
          y1={sy(pActual[1])}
          x2={gradFin[0]}
          y2={gradFin[1]}
          stroke="#dc2626"
          strokeWidth={2}
          markerEnd="url(#flecha-grad)"
        />
        {dirNoAcotada && (
          <line
            data-testid="direccion-no-acotada"
            x1={sx(pActual[0])}
            y1={sy(pActual[1])}
            x2={sx(Math.min(xMax, pActual[0] + toNumber(dirNoAcotada[0]) * xMax))}
            y2={sy(Math.min(yMax, pActual[1] + toNumber(dirNoAcotada[1]) * yMax))}
            stroke="#d97706"
            strokeWidth={3}
            strokeDasharray="8 4"
            markerEnd="url(#flecha)"
            className="text-amber-600"
          />
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={verNoFactibles}
            onChange={(e) => setVerNoFactibles(e.target.checked)}
          />
          Mostrar intersecciones no factibles
        </label>
        <label className="flex items-center gap-2">
          Desplazar recta de nivel
          <input
            type="range"
            min={-escalaZ}
            max={escalaZ}
            step={escalaZ / 100}
            value={desplazamiento}
            onChange={(e) => setDesplazamiento(Number(e.target.value))}
            aria-valuetext={`z = ${+zNivel.toFixed(3)}`}
          />
          <span className="font-mono text-xs">z = {+zNivel.toFixed(3)}</span>
          <button
            type="button"
            onClick={() => setDesplazamiento(0)}
            disabled={desplazamiento === 0}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-slate-700"
          >
            Volver al vértice
          </button>
        </label>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-medium">Punto actual (iteración {k})</dt>
        <dd className="font-mono">
          ({n1}, {n2}) = {fmt(actual.x)}, z = {formatFrac(actual.z, modo)}
          {actual.factible ? '' : ' — fuera de la región factible'}
        </dd>
        <dt className="font-medium">Variables no básicas = 0 ⇔ restricciones activas</dt>
        <dd>{activas.length ? activas.join(', ') : 'ninguna'}</dd>
        <dt className="font-medium">Región</dt>
        <dd>
          {geo.poligono.length === 0
            ? 'vacía (problema infactible)'
            : geo.acotada
              ? `acotada, ${geo.vertices.filter((v) => v.factible).length} vértices factibles`
              : `no acotada (se dibuja recortada), ${geo.vertices.filter((v) => v.factible).length} vértices factibles`}
        </dd>
      </dl>
      <p
        className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400"
        aria-label="Leyenda del gráfico"
      >
        <span>■ azul claro: región factible</span>
        <span>● azul: vértice factible / punto de la trayectoria (numerado por iteración)</span>
        <span>● rojo: punto no factible (Símplex Dual)</span>
        <span>- - rojo: recta de nivel c·x = z</span>
        <span>
          → rojo: gradiente ({problem.sentido === 'max' ? 'c' : '−c'}, dirección de mejora)
        </span>
        {dirNoAcotada && <span>- - ámbar: dirección de crecimiento infinito de z</span>}
      </p>
    </section>
  )
}
