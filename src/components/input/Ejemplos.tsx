import { EJEMPLOS, type Ejemplo } from '../../examples/ejemplos'

interface Props {
  onElegir: (e: Ejemplo) => void
}

export function Ejemplos({ onElegir }: Props) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Ejemplos precargados">
      {EJEMPLOS.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => onElegir(e)}
            className="w-full rounded border border-slate-300 p-2 text-left hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className="block font-medium">{e.nombre}</span>
            <span className="block text-sm text-slate-600 dark:text-slate-400">
              {e.descripcion}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
