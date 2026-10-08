import { useMemo, useState } from 'react'
import { RegionFactible2D } from './components/charts/RegionFactible2D'
import { PanelEntrada } from './components/input/PanelEntrada'
import { VistaProblema } from './components/input/VistaProblema'
import { ThemeToggle } from './components/layout/ThemeToggle'
import { OperacionesFila } from './components/tableau/OperacionesFila'
import { PanelExplicacion } from './components/tableau/PanelExplicacion'
import { PanelMatricial } from './components/tableau/PanelMatricial'
import { Stepper } from './components/tableau/Stepper'
import { TablaSimplex } from './components/tableau/TablaSimplex'
import type { Ejemplo } from './examples/ejemplos'
import { parseProblem, type MatrizImportada, type ModoFormato } from './solver'
import { FormatoContext } from './state/formato'
import { useSimplexSession } from './state/useSimplexSession'

function App() {
  const sesion = useSimplexSession()
  const [modo, setModo] = useState<ModoFormato>('fraccion')
  const formato = useMemo(() => ({ modo, setModo }), [modo])
  const { resultado, snapshot, anteriorSnapshot, error, avisos } = sesion

  const onEjemplo = (e: Ejemplo) => sesion.cargarProblema(parseProblem(e.input))
  const onMatriz = (m: MatrizImportada) => sesion.cargarTableau(m, m.avisos)

  return (
    <FormatoContext.Provider value={formato}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-4 md:p-6">
        <header className="flex flex-wrap items-start gap-3">
          <div className="mr-auto">
            <h1 className="text-3xl font-bold">Visualizador Símplex</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Herramienta de estudio para visualizar paso a paso el método Símplex y el Símplex
              Dual.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Números
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value as ModoFormato)}
              className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="fraccion">Fracción exacta</option>
              <option value="decimal">Decimal</option>
            </select>
          </label>
          <ThemeToggle />
        </header>

        <PanelEntrada
          onProblema={sesion.cargarProblema}
          onMatriz={onMatriz}
          onEjemplo={onEjemplo}
        />

        {error && (
          <div
            role="alert"
            className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"
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

        {resultado && snapshot && (
          <>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <VistaProblema
                standard={resultado.standard}
                inicial={resultado.inicial}
                avisos={avisos}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-4">
                <section
                  aria-label="Tabla Símplex"
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="mb-3 flex flex-wrap items-baseline gap-2">
                    <h2 className="text-xl font-semibold">Iteración {snapshot.k}</h2>
                    <span className="text-sm text-slate-500">
                      {snapshot.pivotesRealizados} pivote
                      {snapshot.pivotesRealizados === 1 ? '' : 's'} realizado
                      {snapshot.pivotesRealizados === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Stepper {...sesion} />
                  <div key={snapshot.k} className="tabla-entrada mt-3">
                    <TablaSimplex snapshot={snapshot} anterior={anteriorSnapshot} />
                  </div>
                </section>
                <OperacionesFila snapshot={snapshot} anterior={anteriorSnapshot} />
                <PanelMatricial snapshot={snapshot} />
              </div>
              <div className="flex flex-col gap-4">
                <PanelExplicacion snapshot={snapshot} />
                {resultado.problem && resultado.problem.nombresVars.length === 2 ? (
                  <RegionFactible2D
                    problem={resultado.problem}
                    snapshots={resultado.snapshots}
                    k={snapshot.k}
                  />
                ) : (
                  <section
                    aria-label="Gráficos"
                    className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700"
                  >
                    El gráfico de la región factible solo está disponible para problemas de 2
                    variables introducidos como problema (no como matriz). Las gráficas de evolución
                    llegarán en la fase (d).
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </FormatoContext.Provider>
  )
}

export default App
