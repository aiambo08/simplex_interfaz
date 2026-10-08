import type { RunResult } from '../../solver'
import { CostesReducidos } from './CostesReducidos'
import { EvolucionZ } from './EvolucionZ'
import { Holguras } from './Holguras'
import { Poliedro3D } from './Poliedro3D'
import { RegionFactible2D } from './RegionFactible2D'
import { VariablesBasicas } from './VariablesBasicas'

interface Props {
  resultado: RunResult
  k: number
  irA: (k: number) => void
}

export function PanelGraficos({ resultado, k, irA }: Props) {
  const { problem, snapshots } = resultado
  const snapshot = snapshots[k]!
  const nVars = problem?.nombresVars.length

  return (
    <div className="space-y-4" aria-label="Gráficos">
      {problem && nVars === 2 && <RegionFactible2D problem={problem} snapshots={snapshots} k={k} />}
      {problem && nVars === 3 && <Poliedro3D problem={problem} snapshots={snapshots} k={k} />}
      {(!problem || (nVars !== 2 && nVars !== 3)) && (
        <section
          aria-label="Región factible"
          className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700"
        >
          {problem
            ? 'La región factible solo se dibuja para problemas de 2 variables (plano) o 3 variables (poliedro).'
            : 'La región factible solo se dibuja para problemas introducidos como problema (no como matriz).'}
        </section>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <EvolucionZ snapshots={snapshots} k={k} irA={irA} />
        <VariablesBasicas snapshots={snapshots} k={k} />
        <CostesReducidos snapshot={snapshot} />
        {problem ? (
          <Holguras problem={problem} snapshot={snapshot} />
        ) : (
          <section
            aria-label="Holguras por restricción"
            className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700"
          >
            Las holguras por restricción requieren el problema original (no disponible al importar
            una matriz).
          </section>
        )}
      </div>
    </div>
  )
}
