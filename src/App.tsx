function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-3xl font-bold">Visualizador Símplex</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Herramienta de estudio para visualizar paso a paso el método Símplex y el Símplex Dual.
        </p>
      </header>
      <section
        aria-label="Estado del proyecto"
        className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
      >
        <p>
          Fase F0: esqueleto del proyecto. El solver, la tabla animada y los gráficos llegarán en
          las siguientes fases.
        </p>
      </section>
    </main>
  )
}

export default App
