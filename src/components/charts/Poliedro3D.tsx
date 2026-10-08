import { useMemo, useState } from 'react'
import { geometria3D, type P3 } from '../../geometry/poliedro3d'
import { formatFrac, toNumber, type Problem, type Snapshot } from '../../solver'
import { useFormato } from '../../state/formato'
import { PALETA } from './util'

interface Props {
  problem: Problem
  snapshots: readonly Snapshot[]
  k: number
}

const W = 560
const H = 460

export function Poliedro3D({ problem, snapshots, k }: Props) {
  const { modo } = useFormato()
  const [azimut, setAzimut] = useState(35)
  const [elevacion, setElevacion] = useState(25)
  const geo = useMemo(() => geometria3D(problem, snapshots), [problem, snapshots])
  const s = snapshots[k]
  if (!geo || !s) return null

  const az = (azimut * Math.PI) / 180
  const el = (elevacion * Math.PI) / 180
  const proyectar = (p: [number, number, number]): [number, number, number] => {
    const x1 = p[0] * Math.cos(az) - p[1] * Math.sin(az)
    const y1 = p[0] * Math.sin(az) + p[1] * Math.cos(az)
    return [x1, p[2] * Math.cos(el) + y1 * Math.sin(el), y1 * Math.cos(el) - p[2] * Math.sin(el)]
  }
  const [L0, L1, L2] = geo.limites
  const esquinas: [number, number, number][] = []
  for (const x of [0, L0])
    for (const y of [0, L1]) for (const z of [0, L2]) esquinas.push([x, y, z])
  const proy = esquinas.map(proyectar)
  const minX = Math.min(...proy.map((p) => p[0]))
  const maxX = Math.max(...proy.map((p) => p[0]))
  const minY = Math.min(...proy.map((p) => p[1]))
  const maxY = Math.max(...proy.map((p) => p[1]))
  const escala = Math.min((W - 80) / (maxX - minX || 1), (H - 80) / (maxY - minY || 1))
  const toSvg = (p: P3 | [number, number, number]): [number, number, number] => {
    const q = proyectar(
      p.map((v) => (typeof v === 'number' ? v : toNumber(v))) as [number, number, number],
    )
    return [40 + (q[0] - minX) * escala, H - 40 - (q[1] - minY) * escala, q[2]]
  }
  const fmt = (x: P3) => `(${x.map((c) => formatFrac(c, modo)).join(', ')})`
  const actual = geo.trayectoria[k]!
  const [n1, n2, n3] = problem.nombresVars as [string, string, string]
  const colorPlano = (id: string) =>
    id.startsWith('R') ? PALETA[(Number(id.slice(1)) - 1) % PALETA.length]! : '#64748b'
  const carasOrdenadas = [...geo.caras]
    .map((c) => ({
      ...c,
      prof:
        c.vertices.reduce((acc, i) => acc + toSvg(geo.vertices[i]!.x)[2], 0) / c.vertices.length,
    }))
    .sort((a, b) => b.prof - a.prof)

  return (
    <section
      aria-label="Poliedro factible 3D"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <h3 className="mb-2 font-semibold">Poliedro factible y trayectoria del Símplex (3D)</h3>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Poliedro factible en ${n1}, ${n2}, ${n3}; iteración ${k} en el punto ${fmt(actual.x)}`}
        className="h-auto w-full max-w-[560px] select-none text-slate-700 dark:text-slate-300"
      >
        <defs>
          <marker
            id="flecha3d"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {(
          [
            [[L0, 0, 0], n1],
            [[0, L1, 0], n2],
            [[0, 0, L2], n3],
          ] as [[number, number, number], string][]
        ).map(([fin, nombre]) => {
          const o = toSvg([0, 0, 0])
          const f = toSvg(fin)
          return (
            <g key={nombre}>
              <line
                x1={o[0]}
                y1={o[1]}
                x2={f[0]}
                y2={f[1]}
                stroke="currentColor"
                strokeWidth={1.2}
                markerEnd="url(#flecha3d)"
              />
              <text x={f[0] + 6} y={f[1] + 4} fontSize={13} fill="currentColor">
                {nombre}
              </text>
            </g>
          )
        })}
        {carasOrdenadas.map((c) => (
          <polygon
            key={c.plano}
            data-testid={`cara-${c.plano}`}
            points={c.vertices
              .map((i) => toSvg(geo.vertices[i]!.x).slice(0, 2).join(','))
              .join(' ')}
            fill={colorPlano(c.plano)}
            opacity={c.plano.startsWith('caja') ? 0.04 : 0.18}
            stroke="none"
          >
            <title>
              {geo.planos.find((p) => p.id === c.plano)?.etiqueta || 'recorte del dibujo'}
            </title>
          </polygon>
        ))}
        {geo.aristas.map((a) => {
          const p = toSvg(geo.vertices[a.i]!.x)
          const q = toSvg(geo.vertices[a.j]!.x)
          const enCaja =
            geo.vertices[a.i]!.planos.some((id) => id.startsWith('caja')) &&
            geo.vertices[a.j]!.planos.some((id) => id.startsWith('caja'))
          return (
            <line
              key={`${a.i}-${a.j}`}
              data-testid="arista"
              x1={p[0]}
              y1={p[1]}
              x2={q[0]}
              y2={q[1]}
              stroke="#0369a1"
              strokeWidth={1.5}
              strokeDasharray={enCaja ? '3 3' : undefined}
              opacity={enCaja ? 0.5 : 0.9}
            />
          )
        })}
        {geo.vertices.map((v, i) => {
          const p = toSvg(v.x)
          return (
            <circle key={i} data-testid="vertice-3d" cx={p[0]} cy={p[1]} r={3.5} fill="#0369a1">
              <title>
                Vértice {fmt(v.x)} — {v.planos.filter((id) => !id.startsWith('caja')).join(' ∩ ')}
              </title>
            </circle>
          )
        })}
        {geo.trayectoria.slice(1).map((t, i) => {
          const a = toSvg(geo.trayectoria[i]!.x)
          const b = toSvg(t.x)
          const recorrido = t.k <= k
          return (
            <line
              key={`tr-${t.k}`}
              data-testid="tramo-3d"
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={recorrido ? '#1d4ed8' : '#94a3b8'}
              strokeWidth={recorrido ? 2.5 : 1.5}
              strokeDasharray={recorrido ? undefined : '4 4'}
              markerEnd="url(#flecha3d)"
              className={recorrido ? 'text-blue-700' : 'text-slate-400'}
              opacity={a[0] === b[0] && a[1] === b[1] ? 0 : 1}
            />
          )
        })}
        {geo.trayectoria.map((t) => {
          const p = toSvg(t.x)
          const esActual = t.k === k
          return (
            <g key={`pt-${t.k}`} data-testid={esActual ? 'punto-actual-3d' : 'punto-3d'}>
              <circle
                cx={p[0]}
                cy={p[1]}
                r={esActual ? 9 : 7}
                fill={
                  t.factible ? (esActual ? '#1d4ed8' : '#60a5fa') : esActual ? '#b91c1c' : '#fca5a5'
                }
                stroke={esActual ? '#111827' : 'white'}
                strokeWidth={esActual ? 2.5 : 1}
                opacity={t.k <= k ? 1 : 0.45}
              />
              <text
                x={p[0]}
                y={p[1] + 3.5}
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
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Giro
          <input
            type="range"
            min={0}
            max={360}
            value={azimut}
            onChange={(e) => setAzimut(Number(e.target.value))}
            aria-valuetext={`${azimut}°`}
          />
          <span className="font-mono text-xs">{azimut}°</span>
        </label>
        <label className="flex items-center gap-2">
          Elevación
          <input
            type="range"
            min={-80}
            max={80}
            value={elevacion}
            onChange={(e) => setElevacion(Number(e.target.value))}
            aria-valuetext={`${elevacion}°`}
          />
          <span className="font-mono text-xs">{elevacion}°</span>
        </label>
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-medium">Punto actual (iteración {k})</dt>
        <dd className="font-mono">
          ({n1}, {n2}, {n3}) = {fmt(actual.x)}, z = {formatFrac(actual.z, modo)}
          {actual.factible ? '' : ' — fuera de la región factible'}
        </dd>
        <Caras geo={geo} />
      </dl>
      <p
        className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400"
        aria-label="Leyenda del gráfico 3D"
      >
        <span>caras coloreadas: restricciones R_i y planos coordenados</span>
        <span>● azul: vértice / punto de la trayectoria (numerado por iteración)</span>
        <span>● rojo: punto no factible</span>
        <span>- - : aristas del recorte cuando el poliedro no está acotado</span>
      </p>
    </section>
  )
}

function Caras({ geo }: { geo: NonNullable<ReturnType<typeof geometria3D>> }) {
  return (
    <>
      <dt className="font-medium">Poliedro</dt>
      <dd>
        {geo.acotada ? 'acotado' : 'no acotado (se dibuja recortado)'},{' '}
        {geo.vertices.filter((v) => !v.planos.some((id) => id.startsWith('caja'))).length} vértices
        factibles, {geo.caras.filter((c) => c.plano.startsWith('R')).length} caras de restricciones
      </dd>
    </>
  )
}
