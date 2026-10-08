import { useState } from 'react'
import type { Ejemplo } from '../../examples/ejemplos'
import type { MatrizImportada, Problem } from '../../solver'
import { Ejemplos } from './Ejemplos'
import { FormularioGuiado } from './FormularioGuiado'
import { MatrizDirecta } from './MatrizDirecta'

type Pestana = 'formulario' | 'matriz' | 'ejemplos'

interface Props {
  onProblema: (p: Problem) => void
  onMatriz: (m: MatrizImportada) => void
  onEjemplo: (e: Ejemplo) => void
}

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'ejemplos', etiqueta: 'Ejemplos' },
  { id: 'formulario', etiqueta: 'Formulario guiado' },
  { id: 'matriz', etiqueta: 'Matriz directa' },
]

export function PanelEntrada({ onProblema, onMatriz, onEjemplo }: Props) {
  const [activa, setActiva] = useState<Pestana>('ejemplos')
  return (
    <section
      aria-label="Entrada del problema"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <div
        role="tablist"
        aria-label="Modo de entrada"
        className="mb-3 flex gap-1 border-b border-slate-200 dark:border-slate-800"
      >
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={activa === p.id}
            onClick={() => setActiva(p.id)}
            className={`-mb-px rounded-t px-3 py-1.5 text-sm font-medium ${
              activa === p.id
                ? 'border border-b-white border-slate-200 bg-white dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {activa === 'formulario' && <FormularioGuiado onResolver={onProblema} />}
        {activa === 'matriz' && <MatrizDirecta onImportar={onMatriz} />}
        {activa === 'ejemplos' && <Ejemplos onElegir={onEjemplo} />}
      </div>
    </section>
  )
}
