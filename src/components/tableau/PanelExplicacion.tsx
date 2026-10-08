import type { Snapshot } from '../../solver'

interface Props {
  snapshot: Snapshot
}

const ESTADO: Record<Snapshot['estado'], { texto: string; clase: string }> = {
  continua: {
    texto: 'En curso',
    clase: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
  },
  optimo: {
    texto: '✓ Óptimo',
    clase: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  },
  no_acotado: {
    texto: '∞ No acotado',
    clase: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  },
  infactible: {
    texto: '∅ Infactible',
    clase: 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
  },
  bloqueado: {
    texto: '⚠ Bloqueado',
    clase: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  },
}

export function PanelExplicacion({ snapshot: s }: Props) {
  const estado = ESTADO[s.estado]
  const etiquetas: string[] = []
  if (s.metodo === 'dual' || s.pivote?.metodo === 'dual') etiquetas.push('Símplex Dual')
  else if (s.pivote?.metodo === 'primal') etiquetas.push('Símplex estándar')
  if (s.flags.degenerado) etiquetas.push('⚠ Degenerado')
  if (s.flags.empateFilas.length > 1) etiquetas.push('Empate → Bland')
  if (s.flags.optimosAlternativosCols.length > 0) etiquetas.push('Óptimos alternativos')
  if (!s.factible) etiquetas.push('Base no factible (b < 0)')

  return (
    <section
      aria-label="¿Qué ha pasado y por qué?"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">¿Qué ha pasado y por qué?</h3>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${estado.clase}`}>
          {estado.texto}
        </span>
        {etiquetas.map((e) => (
          <span key={e} className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
            {e}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          Renglón z en convención{' '}
          {s.convencionZ === 'max'
            ? 'max (entra el más negativo)'
            : 'min (óptimo si no hay positivos)'}
        </span>
      </div>
      <h4 className="font-medium">{s.explicacion.titulo}</h4>
      <div className="mt-1 flex flex-col gap-2 text-sm leading-relaxed">
        {s.explicacion.parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  )
}
