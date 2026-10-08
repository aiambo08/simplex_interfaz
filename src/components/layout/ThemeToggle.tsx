import { useEffect, useState } from 'react'

type Tema = 'claro' | 'oscuro'

function temaInicial(): Tema {
  const guardado = localStorage.getItem('tema')
  if (guardado === 'claro' || guardado === 'oscuro') return guardado
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaInicial)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
    localStorage.setItem('tema', tema)
  }, [tema])
  return (
    <button
      type="button"
      onClick={() => setTema(tema === 'oscuro' ? 'claro' : 'oscuro')}
      aria-pressed={tema === 'oscuro'}
      className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      {tema === 'oscuro' ? '☀ Modo claro' : '☾ Modo oscuro'}
    </button>
  )
}
