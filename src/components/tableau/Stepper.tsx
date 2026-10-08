import { useEffect } from 'react'
import type { SesionSimplex } from '../../state/useSimplexSession'

type Props = Pick<
  SesionSimplex,
  | 'k'
  | 'total'
  | 'reproduciendo'
  | 'anterior'
  | 'siguiente'
  | 'reiniciar'
  | 'irA'
  | 'setReproduciendo'
>

const btn =
  'rounded border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800'

function esCampoEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return (
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.isContentEditable
  )
}

export function Stepper({
  k,
  total,
  reproduciendo,
  anterior,
  siguiente,
  reiniciar,
  irA,
  setReproduciendo,
}: Props) {
  const ultimo = total - 1
  const alFinal = k >= ultimo

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (esCampoEditable(ev.target)) return
      if (ev.key === 'ArrowRight') {
        ev.preventDefault()
        siguiente()
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault()
        anterior()
      } else if (ev.key === 'Home') {
        ev.preventDefault()
        reiniciar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [siguiente, anterior, reiniciar])

  return (
    <div className="flex flex-col gap-2" aria-label="Control de iteraciones">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={reiniciar} disabled={k === 0}>
          ⏮ Reiniciar
        </button>
        <button
          type="button"
          className={btn}
          onClick={anterior}
          disabled={k === 0}
          aria-keyshortcuts="ArrowLeft"
        >
          ← Anterior
        </button>
        <button
          type="button"
          className={btn}
          onClick={siguiente}
          disabled={alFinal}
          aria-keyshortcuts="ArrowRight"
        >
          Siguiente →
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setReproduciendo(!reproduciendo)}
          aria-pressed={reproduciendo}
        >
          {reproduciendo ? '⏸ Pausa' : '▶ Play'}
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          Ir a
          <select
            value={k}
            onChange={(e) => irA(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {Array.from({ length: total }, (_, i) => (
              <option key={i} value={i}>
                Paso {i}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ultimo}
        aria-valuenow={k}
        aria-label={`Paso ${k} de ${ultimo}`}
        className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800"
      >
        <div
          className="h-full bg-sky-600 transition-all duration-300"
          style={{ width: `${ultimo > 0 ? (k / ultimo) * 100 : 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Paso {k} de {ultimo}. Teclado: ← anterior, → siguiente, Inicio reiniciar.
      </p>
    </div>
  )
}
