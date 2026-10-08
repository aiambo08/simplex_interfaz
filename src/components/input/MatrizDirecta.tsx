import { useState, type ChangeEvent } from 'react'
import { importarMatriz, SolverError, type FormatoMatriz, type MatrizImportada } from '../../solver'
import type { ErrorEntrada } from '../../state/useSimplexSession'

interface Props {
  onImportar: (m: MatrizImportada) => void
}

const EJEMPLO = `x1,x2,s1,s2,s3,b
-3,-5,0,0,0,0
1,0,1,0,0,4
0,2,0,1,0,12
3,2,0,0,1,18`

export function MatrizDirecta({ onImportar }: Props) {
  const [texto, setTexto] = useState('')
  const [formato, setFormato] = useState<FormatoMatriz>('auto')
  const [error, setError] = useState<ErrorEntrada | null>(null)

  const importar = () => {
    try {
      const m = importarMatriz(texto, formato)
      setError(null)
      onImportar(m)
    } catch (e) {
      setError(
        e instanceof SolverError
          ? { mensaje: e.message, detalles: e.detalles }
          : { mensaje: String(e), detalles: [] },
      )
    }
  }

  const subirArchivo = (ev: ChangeEvent<HTMLInputElement>) => {
    const archivo = ev.target.files?.[0]
    if (!archivo) return
    archivo.text().then((t) => {
      setTexto(t)
      if (archivo.name.endsWith('.json')) setFormato('json')
      else if (archivo.name.endsWith('.csv')) setFormato('csv')
    })
  }

  return (
    <div className="flex flex-col gap-3" aria-label="Matriz Símplex directa">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Pega la matriz con el <strong>renglón z en la primera fila</strong> y los{' '}
        <strong>términos independientes en la última columna</strong>. La primera fila puede ser una
        cabecera con los nombres de las variables. Se detectan automáticamente las columnas de la
        identidad (variables básicas).
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Matriz (CSV, JSON o texto separado por espacios)</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={EJEMPLO}
          className="rounded border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Formato
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as FormatoMatriz)}
            className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="auto">Automático</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="texto">Texto</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Subir archivo
          <input type="file" accept=".csv,.json,.txt" onChange={subirArchivo} className="text-xs" />
        </label>
        <button
          type="button"
          onClick={() => setTexto(EJEMPLO)}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Usar ejemplo
        </button>
      </div>
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
        type="button"
        onClick={importar}
        className="self-start rounded bg-sky-700 px-4 py-1.5 font-medium text-white hover:bg-sky-800"
      >
        Importar y resolver
      </button>
    </div>
  )
}
