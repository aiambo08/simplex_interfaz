import { formatFrac, type InitialTableau, type StandardForm } from '../../solver'
import { useFormato } from '../../state/formato'
import { lineal } from '../common/lineal'

interface Props {
  standard?: StandardForm
  inicial: InitialTableau
  avisos: string[]
}

const REL = { '<=': '≤', '>=': '≥', '=': '=' } as const

export function VistaProblema({ standard, inicial, avisos }: Props) {
  const { modo } = useFormato()
  const p = standard?.original
  return (
    <section aria-label="Problema y forma estándar" className="grid gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-1 font-semibold">Problema original</h3>
        {p ? (
          <div className="font-mono text-sm">
            <p>
              {p.sentido === 'max' ? 'Maximizar' : 'Minimizar'} z ={' '}
              {lineal(p.c, p.nombresVars, modo)}
            </p>
            <p className="mt-1">sujeto a:</p>
            <ul className="pl-4">
              {p.restricciones.map((r, i) => (
                <li key={i}>
                  {lineal(r.coef, p.nombresVars, modo)} {REL[r.rel]} {formatFrac(r.b, modo)}
                </li>
              ))}
              <li>{p.nombresVars.join(', ')} ≥ 0</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tabla importada directamente: se parte de la matriz dada, con{' '}
            {inicial.varNames.join(', ')} como variables.
          </p>
        )}
      </div>
      <div>
        <h3 className="mb-1 font-semibold">Forma estándar</h3>
        {standard ? (
          <div className="font-mono text-sm">
            <p>
              Maximizar {standard.signoZ === -1 ? "z' = −z" : 'z'} ={' '}
              {lineal(standard.c, standard.varNames, modo)}
            </p>
            <p className="mt-1">sujeto a:</p>
            <ul className="pl-4">
              {standard.A.map((fila, i) => (
                <li key={i}>
                  {lineal(fila, standard.varNames, modo)} = {formatFrac(standard.b[i]!, modo)}
                </li>
              ))}
              <li>{standard.varNames.join(', ')} ≥ 0</li>
            </ul>
            <details className="mt-2 font-sans">
              <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
                Cómo se ha obtenido
              </summary>
              <ul className="mt-1 list-disc pl-5 text-slate-700 dark:text-slate-300">
                {standard.notas.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Variables básicas detectadas: {inicial.basis.map((j) => inicial.varNames[j]).join(', ')}
            .
          </p>
        )}
        {avisos.length > 0 && (
          <ul className="mt-2 list-disc rounded border border-amber-300 bg-amber-50 p-2 pl-6 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
