import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EJEMPLOS } from '../../examples/ejemplos'
import { importarMatriz, parseProblem, runAll } from '../../solver'
import { PanelGraficos } from './PanelGraficos'

const ejemplo = (id: string) => parseProblem(EJEMPLOS.find((e) => e.id === id)!.input)

describe('PanelGraficos', () => {
  it('muestra evolución de z, básicas, costes reducidos y holguras sincronizados con k', () => {
    const r = runAll(ejemplo('produccion-2v'))
    const irA = vi.fn()
    render(<PanelGraficos resultado={r} k={1} irA={irA} />)
    expect(
      screen.getByRole('img', { name: /z por iteración: k=0 z=0, k=1 z=30, k=2 z=36/ }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ir a la iteración 2, z = 36' }))
    expect(irA).toHaveBeenCalledWith(2)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ir a la iteración 0, z = 0' }), {
      key: 'Enter',
    })
    expect(irA).toHaveBeenCalledWith(0)
    expect(screen.getByText(/Iteración 1: s1 = 4, x2 = 6, s3 = 6/)).toBeInTheDocument()
    expect(screen.getByText('Renglón z (costes reducidos) en la iteración 1')).toBeInTheDocument()
    expect(screen.getByTestId('coste-entra')).toHaveTextContent('x1')
    expect(
      screen.getByRole('img', {
        name: /Holguras: R1 usado 0 de 4; R2 usado 12 de 12; R3 usado 12 de 18/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/s2 = 0 \(activa\)/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Región factible en el plano/ })).toBeInTheDocument()
  })

  it('dibuja el poliedro 3D para 3 variables y permite girarlo', () => {
    const r = runAll(ejemplo('mezcla-3v'))
    render(<PanelGraficos resultado={r} k={r.snapshots.length - 1} irA={() => undefined} />)
    expect(
      screen.getByRole('img', {
        name: /Poliedro factible en x1, x2, x3; iteración \d+ en el punto \(2, 0, 1\)/,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('arista').length).toBeGreaterThan(5)
    expect(screen.getAllByTestId(/^cara-R/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('punto-actual-3d')).toBeInTheDocument()
    const antes = screen.getAllByTestId('vertice-3d').map((c) => c.getAttribute('cx'))
    fireEvent.change(screen.getByRole('slider', { name: /Giro/ }), { target: { value: '120' } })
    expect(screen.getByText('120°')).toBeInTheDocument()
    const despues = screen.getAllByTestId('vertice-3d').map((c) => c.getAttribute('cx'))
    expect(despues).not.toEqual(antes)
    expect(
      screen.queryByRole('img', { name: /Región factible en el plano/ }),
    ).not.toBeInTheDocument()
  })

  it('sin problema original (matriz importada) mantiene evolución y costes pero avisa de región y holguras', () => {
    const m = importarMatriz(
      'x1,x2,s1,s2,s3,b\n-3,-5,0,0,0,0\n1,0,1,0,0,4\n0,2,0,1,0,12\n3,2,0,0,1,18',
    )
    const r = runAll(m)
    render(<PanelGraficos resultado={r} k={0} irA={() => undefined} />)
    expect(screen.getByText(/no como matriz/)).toBeInTheDocument()
    expect(screen.getByText(/requieren el problema original/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /z por iteración/ })).toBeInTheDocument()
    expect(screen.getByTestId('coste-entra')).toHaveTextContent('x2')
  })

  it('marca la columna no acotada en los costes reducidos y las restricciones violadas en el Dual', () => {
    const na = runAll(ejemplo('no-acotado'))
    const { unmount } = render(
      <PanelGraficos resultado={na} k={na.snapshots.length - 1} irA={() => undefined} />,
    )
    expect(screen.getByText(/debería entrar pero su columna no limita/)).toBeInTheDocument()
    unmount()
    const dieta = runAll(ejemplo('dieta-dual'))
    render(<PanelGraficos resultado={dieta} k={0} irA={() => undefined} />)
    expect(screen.getAllByText(/violada: punto no factible/).length).toBe(2)
  })
})
