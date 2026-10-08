import { useState, type FormEvent } from 'react'
import {
  parseProblem,
  RELACIONES,
  SolverError,
  type Problem,
  type Relacion,
  type Sentido,
} from '../../solver'
import type { ErrorEntrada } from '../../state/useSimplexSession'

interface FilaRestriccion {
  coef: string[]
  rel: Relacion
  b: string
}

interface Props {
  onResolver: (p: Problem) => void
}

const MAX_VARS = 6
const inputCls =
  'w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-sm dark:border-slate-700 dark:bg-slate-900'

function filaVacia(n: number): FilaRestriccion {
  return { coef: Array.from({ length: n }, () => ''), rel: '<=', b: '' }
}

export function FormularioGuiado({ onResolver }: Props) {
  const [nVars, setNVars] = useState(2)
  const [sentido, setSentido] = useState<Sentido>('max')
  const [c, setC] = useState<string[]>(['', ''])
  const [filas, setFilas] = useState<FilaRestriccion[]>([filaVacia(2), filaVacia(2)])
  const [error, setError] = useState<ErrorEntrada | null>(null)

  const cambiarNVars = (n: number) => {
    const ajustar = (arr: string[]) => Array.from({ length: n }, (_, j) => arr[j] ?? '')
    setNVars(n)
    setC(ajustar(c))
    setFilas(filas.map((f) => ({ ...f, coef: ajustar(f.coef) })))
  }

  const enviar = (ev: FormEvent) => {
    ev.preventDefault()
    try {
      const p = parseProblem({
        sentido,
        c: c.map((v) => (v.trim() === '' ? '0' : v)),
        restricciones: filas.map((f) => ({
          coef: f.coef.map((v) => (v.trim() === '' ? '0' : v)),
          rel: f.rel,
          b: f.b,
        })),
      })
      setError(null)
      onResolver(p)
    } catch (e) {
      setError(
        e instanceof SolverError
          ? { mensaje: e.message, detalles: e.detalles }
          : { mensaje: String(e), detalles: [] },
      )
    }
  }

  const nombres = Array.from({ length: nVars }, (_, j) => `x${j + 1}`)

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3" aria-label="Formulario guiado">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Tipo
          <select
            value={sentido}
            onChange={(e) => setSentido(e.target.value as Sentido)}
            className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="max">Maximizar</option>
            <option value="min">Minimizar</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Nº de variables
          <input
            aria-label="Nº de variables"
            type="number"
            min={1}
            max={MAX_VARS}
            value={nVars}
            onChange={(e) =>
              cambiarNVars(Math.max(1, Math.min(MAX_VARS, Number(e.target.value) || 1)))
            }
            className={inputCls}
          />
        </label>
      </div>

      <fieldset className="flex flex-wrap items-center gap-1 text-sm">
        <legend className="mb-1 font-medium">Función objetivo z =</legend>
        {nombres.map((nombre, j) => (
          <label key={nombre} className="flex items-center gap-1">
            <input
              aria-label={`Coeficiente de ${nombre} en z`}
              value={c[j] ?? ''}
              onChange={(e) => setC(c.map((v, i) => (i === j ? e.target.value : v)))}
              placeholder="0"
              className={inputCls}
            />
            <span>
              {nombre}
              {j < nVars - 1 ? ' +' : ''}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Restricciones (x ≥ 0 implícito)</legend>
        {filas.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1">
            <span className="w-6 text-slate-500">R{i + 1}</span>
            {nombres.map((nombre, j) => (
              <label key={nombre} className="flex items-center gap-1">
                <input
                  aria-label={`Coeficiente de ${nombre} en la restricción ${i + 1}`}
                  value={f.coef[j] ?? ''}
                  onChange={(e) =>
                    setFilas(
                      filas.map((g, k) =>
                        k === i
                          ? { ...g, coef: g.coef.map((v, jj) => (jj === j ? e.target.value : v)) }
                          : g,
                      ),
                    )
                  }
                  placeholder="0"
                  className={inputCls}
                />
                <span>
                  {nombre}
                  {j < nVars - 1 ? ' +' : ''}
                </span>
              </label>
            ))}
            <label>
              <select
                aria-label={`Relación de la restricción ${i + 1}`}
                value={f.rel}
                onChange={(e) =>
                  setFilas(
                    filas.map((g, k) => (k === i ? { ...g, rel: e.target.value as Relacion } : g)),
                  )
                }
                className="rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900"
              >
                {RELACIONES.map((r) => (
                  <option key={r} value={r}>
                    {r === '<=' ? '≤' : r === '>=' ? '≥' : '='}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                aria-label={`Término independiente de la restricción ${i + 1}`}
                value={f.b}
                onChange={(e) =>
                  setFilas(filas.map((g, k) => (k === i ? { ...g, b: e.target.value } : g)))
                }
                placeholder="b"
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => setFilas(filas.filter((_, k) => k !== i))}
              disabled={filas.length === 1}
              aria-label={`Eliminar restricción ${i + 1}`}
              className="rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFilas([...filas, filaVacia(nVars)])}
          className="self-start rounded border border-dashed border-slate-400 px-2 py-0.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          + Añadir restricción
        </button>
      </fieldset>

      <p className="text-xs text-slate-500">
        Se aceptan enteros, decimales (2.5 o 2,5) y fracciones (7/3). Las restricciones de igualdad
        no están soportadas (Gran M / dos fases, fuera del temario).
      </p>

      {error && (
        <div
          role="alert"
          className="rounded border border-rose-300 bg-rose-50 p-2 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"
        >
          <p className="font-medium">{error.mensaje}</p>
          {error.detalles.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        className="self-start rounded bg-sky-700 px-4 py-1.5 font-medium text-white hover:bg-sky-800"
      >
        Resolver
      </button>
    </form>
  )
}
