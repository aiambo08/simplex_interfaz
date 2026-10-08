import type { Snapshot } from '../../solver'
import { Num } from '../common/Num'

interface Props {
  snapshot: Snapshot
  anterior: Snapshot | null
}

/** Operaciones elementales que han producido la tabla actual a partir de la anterior. */
export function OperacionesFila({ snapshot: s, anterior }: Props) {
  const nombreFila = (snap: Snapshot, i: number) =>
    i === 0 ? 'z' : snap.varNames[snap.basis[i - 1]!]!
  if (s.cambioConvencion) {
    return (
      <section
        aria-label="Operaciones elementales"
        className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800"
      >
        <h3 className="mb-1 font-semibold">Operaciones aplicadas</h3>
        <p className="font-mono">F_z ← −F_z</p>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Cambio de convención {s.cambioConvencion.de} → {s.cambioConvencion.a}: se multiplica el
          renglón z por −1.
        </p>
      </section>
    )
  }
  const ops = s.operaciones
  if (!ops || !anterior) return null
  const pivNombre = nombreFila(anterior, ops.fila)
  return (
    <section
      aria-label="Operaciones elementales"
      className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800"
    >
      <h3 className="mb-1 font-semibold">Operaciones aplicadas (tabla anterior → actual)</h3>
      <ul className="font-mono">
        <li>
          F<sub>{pivNombre}</sub> ← F<sub>{pivNombre}</sub> / <Num v={ops.divisor} />
          <span className="ml-2 font-sans text-slate-500">
            (fila pivote dividida por el elemento pivote)
          </span>
        </li>
        {ops.eliminaciones.map((op) => {
          const n = nombreFila(anterior, op.fila)
          const neg = op.factor.compare(0) < 0
          return (
            <li key={op.fila}>
              F<sub>{n}</sub> ← F<sub>{n}</sub> {neg ? '+' : '−'} <Num v={op.factor.abs()} /> · F
              <sub>{pivNombre}</sub>
              {op.factor.equals(0) && (
                <span className="ml-2 font-sans text-slate-500">
                  (ya tenía 0 en la columna pivote)
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
