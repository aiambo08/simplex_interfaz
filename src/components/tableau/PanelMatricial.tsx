import type { Snapshot } from '../../solver'
import { Num } from '../common/Num'

interface Props {
  snapshot: Snapshot
}

const celda =
  'border border-slate-200 px-2 py-0.5 text-center font-mono text-sm dark:border-slate-700'

function Matriz({
  M,
  etiqueta,
}: {
  M: readonly (readonly import('../../solver').Frac[])[]
  etiqueta: string
}) {
  return (
    <table className="border-collapse" aria-label={etiqueta}>
      <tbody>
        {M.map((fila, i) => (
          <tr key={i}>
            {fila.map((v, j) => (
              <td key={j} className={celda}>
                <Num v={v} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PanelMatricial({ snapshot: s }: Props) {
  const basicas = s.basis.map((j) => s.varNames[j]!)
  const colsBase = s.comprobacion.columnasBase.map((j) => s.varNames[j]!)
  return (
    <section
      aria-label="Formulación matricial"
      className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800"
    >
      <h3 className="mb-2 font-semibold">Formulación matricial</h3>
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="mb-1">
            B⁻¹ <span className="text-slate-500">(base: {basicas.join(', ')})</span>
          </p>
          <Matriz M={s.Binv} etiqueta="Inversa de la base" />
        </div>
        <div>
          <p className="mb-1">c_Bᵀ B⁻¹</p>
          <Matriz M={[s.cBBinv]} etiqueta="c_B transpuesta por B inversa" />
        </div>
        <div>
          <p className="mb-1">x_B = B⁻¹ b</p>
          <table className="border-collapse" aria-label="Solución básica">
            <tbody>
              {s.xB.map((v, i) => (
                <tr key={i}>
                  <th
                    scope="row"
                    className={`${celda} font-sans font-normal text-slate-600 dark:text-slate-400`}
                  >
                    {basicas[i]}
                  </th>
                  <td className={celda}>
                    <Num v={v} />
                  </td>
                </tr>
              ))}
              <tr>
                <th
                  scope="row"
                  className={`${celda} font-sans font-normal text-slate-600 dark:text-slate-400`}
                >
                  z
                </th>
                <td className={`${celda} font-semibold`}>
                  <Num v={s.zOriginal} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        <li>
          {s.comprobacion.BinvCoincide ? '✓' : '✗'} Las columnas {colsBase.join(', ')} de la tabla
          coinciden con B⁻¹.
        </li>
        <li>
          {s.comprobacion.cBBinvCoincide ? '✓' : '✗'} El renglón z en las columnas{' '}
          {colsBase.join(', ')} coincide con c_Bᵀ B⁻¹
          {s.convencionZ === 'min' ? ' (con el signo cambiado por la convención min)' : ''}.
        </li>
        <li>
          Variables no básicas = 0:{' '}
          {s.varNames.filter((_, j) => !s.basis.includes(j)).join(', ') || 'ninguna'}.
        </li>
      </ul>
    </section>
  )
}
