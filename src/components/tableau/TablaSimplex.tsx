import type { Snapshot } from '../../solver'
import { Num } from '../common/Num'

interface Props {
  snapshot: Snapshot
  anterior: Snapshot | null
}

const celda =
  'border border-slate-200 px-2 py-1 text-center font-mono text-sm dark:border-slate-700'

/**
 * Tabla Símplex del snapshot: renglón z en la primera fila, b en la última columna. Resalta la
 * columna pivote (entra), la fila pivote (sale), el elemento pivote y el renglón z; muestra los
 * cocientes b_i / a_ie (primal) o |z_j / a_rj| (dual) y tacha las filas no elegibles.
 */
export function TablaSimplex({ snapshot: s, anterior }: Props) {
  const nVars = s.varNames.length
  const p = s.pivote
  const primal = p?.metodo === 'primal'
  const dual = p?.metodo === 'dual'
  const cocPorFila = primal ? new Map(p.cocientes.map((c) => [c.indice, c])) : null
  const cocPorCol = dual ? new Map(p.cocientes.map((c) => [c.indice, c])) : null
  const cambiada = (i: number, j: number) =>
    anterior !== null && !anterior.tableau[i]![j]!.equals(s.tableau[i]![j]!)

  const claseCelda = (i: number, j: number) => {
    const clases = [celda]
    if (i === 0) clases.push('bg-amber-50 font-semibold dark:bg-amber-950/40')
    if (p && j === p.col) clases.push('bg-sky-100 dark:bg-sky-900/40')
    if (p && i === p.fila) clases.push('bg-rose-100 dark:bg-rose-900/40')
    if (p && i === p.fila && j === p.col)
      clases.push(
        'pivote bg-emerald-200 font-bold ring-2 ring-inset ring-emerald-700 dark:bg-emerald-800',
      )
    if (cambiada(i, j)) clases.push('celda-cambiada')
    return clases.join(' ')
  }

  const filaNoElegible = (i: number) => (cocPorFila ? cocPorFila.get(i)?.elegible === false : false)

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" aria-label={`Tabla Símplex, iteración ${s.k}`}>
        <caption className="sr-only">
          Renglón z en la primera fila y términos independientes en la última columna. Convención{' '}
          {s.convencionZ}.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${celda} bg-slate-50 dark:bg-slate-900`}>
              Base
            </th>
            {s.varNames.map((nombre, j) => (
              <th
                key={nombre}
                scope="col"
                className={`${celda} bg-slate-50 dark:bg-slate-900 ${p && j === p.col ? 'bg-sky-100 dark:bg-sky-900/40' : ''}`}
                aria-label={p && j === p.col ? `${nombre}, variable que entra` : nombre}
              >
                {nombre}
                {p && j === p.col && (
                  <span className="ml-1 text-sky-700 dark:text-sky-300" aria-hidden="true">
                    ↓ entra
                  </span>
                )}
              </th>
            ))}
            <th scope="col" className={`${celda} bg-slate-50 dark:bg-slate-900`}>
              b
            </th>
            {primal && (
              <th scope="col" className={`${celda} bg-slate-50 dark:bg-slate-900`}>
                b<sub>i</sub> / a<sub>ie</sub>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {s.tableau.map((fila, i) => {
            const nombreFila = i === 0 ? 'z' : s.varNames[s.basis[i - 1]!]!
            const sale = p && i === p.fila
            const noElegible = i > 0 && filaNoElegible(i)
            const coc = i > 0 ? cocPorFila?.get(i) : undefined
            return (
              <tr key={i} className={noElegible ? 'opacity-60' : ''}>
                <th
                  scope="row"
                  className={`${celda} ${i === 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-slate-50 dark:bg-slate-900'} ${
                    sale ? 'bg-rose-100 dark:bg-rose-900/40' : ''
                  } ${noElegible ? 'line-through' : ''}`}
                  aria-label={sale ? `${nombreFila}, variable que sale` : nombreFila}
                >
                  {nombreFila}
                  {sale && (
                    <span className="ml-1 text-rose-700 dark:text-rose-300" aria-hidden="true">
                      → sale
                    </span>
                  )}
                </th>
                {fila.map((v, j) => (
                  <td
                    key={j}
                    className={claseCelda(i, j)}
                    aria-label={p && i === p.fila && j === p.col ? 'elemento pivote' : undefined}
                  >
                    <Num v={v} />
                  </td>
                ))}
                {primal && (
                  <td
                    className={`${celda} ${coc?.minimo ? 'font-bold text-emerald-800 dark:text-emerald-300' : ''} ${noElegible ? 'line-through' : ''}`}
                  >
                    {i === 0 ? (
                      ''
                    ) : coc?.elegible && coc.valor ? (
                      <>
                        <Num v={fila[nVars]!} /> / <Num v={fila[p.col]!} /> = <Num v={coc.valor} />
                        {coc.minimo && <span className="ml-1">← mín</span>}
                      </>
                    ) : (
                      <span title="a_ie ≤ 0: no limita">—</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
          {dual && (
            <tr>
              <th scope="row" className={`${celda} bg-slate-50 text-xs dark:bg-slate-900`}>
                |z<sub>j</sub> / a<sub>rj</sub>|
              </th>
              {s.varNames.map((_, j) => {
                const c = cocPorCol!.get(j)
                return (
                  <td
                    key={j}
                    className={`${celda} text-xs ${c?.minimo ? 'font-bold text-emerald-800 dark:text-emerald-300' : ''} ${c && !c.elegible ? 'line-through text-slate-400' : ''}`}
                  >
                    {c?.elegible && c.valor ? (
                      <>
                        <Num v={c.valor} />
                        {c.minimo && <span className="ml-1">← mín</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                )
              })}
              <td className={celda} />
            </tr>
          )}
        </tbody>
      </table>
      {p && (
        <p
          className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400"
          aria-label="Leyenda"
        >
          <span>
            <span className="inline-block h-3 w-3 rounded bg-amber-100 align-middle dark:bg-amber-950" />{' '}
            renglón z
          </span>
          <span>
            <span className="inline-block h-3 w-3 rounded bg-sky-100 align-middle dark:bg-sky-900" />{' '}
            columna pivote (↓ entra {s.varNames[p.entra]})
          </span>
          <span>
            <span className="inline-block h-3 w-3 rounded bg-rose-100 align-middle dark:bg-rose-900" />{' '}
            fila pivote (→ sale {s.varNames[p.sale]})
          </span>
          <span>
            <span className="inline-block h-3 w-3 rounded bg-emerald-200 align-middle ring-1 ring-emerald-700 dark:bg-emerald-800" />{' '}
            elemento pivote
          </span>
          {primal && (
            <span>
              tachado: a<sub>ie</sub> ≤ 0, no limita
            </span>
          )}
        </p>
      )}
    </div>
  )
}
