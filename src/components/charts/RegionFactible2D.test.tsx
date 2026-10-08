import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EJEMPLOS } from '../../examples/ejemplos'
import { parseProblem, runAll } from '../../solver'
import { RegionFactible2D } from './RegionFactible2D'

const ejemplo = (id: string) => parseProblem(EJEMPLOS.find((e) => e.id === id)!.input)

describe('RegionFactible2D', () => {
  it('dibuja región, restricciones, vértices, trayectoria, recta de nivel y gradiente', () => {
    const p = ejemplo('produccion-2v')
    const { snapshots } = runAll(p)
    render(<RegionFactible2D problem={p} snapshots={snapshots} k={0} />)
    expect(
      screen.getByRole('img', {
        name: /Región factible en el plano x1-x2; iteración 0 en el punto \(0, 0\)/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('region-factible')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^recta-R/)).toHaveLength(3)
    expect(screen.getAllByTestId('vertice-factible')).toHaveLength(5)
    expect(screen.queryAllByTestId('vertice-no-factible')).toHaveLength(0)
    expect(screen.getAllByTestId('tramo-trayectoria')).toHaveLength(2)
    expect(screen.getByTestId('punto-actual')).toHaveTextContent('0')
    expect(screen.queryByTestId('recta-nivel')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: /Desplazar recta de nivel/ }), {
      target: { value: '10' },
    })
    expect(screen.getByTestId('recta-nivel')).toBeInTheDocument()
    expect(screen.getByTestId('gradiente')).toBeInTheDocument()
    expect(screen.getByText('x1 = 0, x2 = 0')).toBeInTheDocument()
  })

  it('el punto actual sigue a la iteración k y muestra las restricciones activas', () => {
    const p = ejemplo('produccion-2v')
    const { snapshots } = runAll(p)
    render(<RegionFactible2D problem={p} snapshots={snapshots} k={2} />)
    expect(
      screen.getByRole('img', { name: /iteración 2 en el punto \(2, 6\)/ }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('punto-actual')).toHaveTextContent('2')
    expect(screen.getByTestId('recta-nivel')).toBeInTheDocument()
    expect(screen.getByText('R2 (s2 = 0), R3 (s3 = 0)')).toBeInTheDocument()
  })

  it('permite mostrar las intersecciones no factibles y desplazar la recta de nivel', () => {
    const p = ejemplo('produccion-2v')
    const { snapshots } = runAll(p)
    render(<RegionFactible2D problem={p} snapshots={snapshots} k={1} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /intersecciones no factibles/ }))
    expect(screen.getAllByTestId('vertice-no-factible').length).toBeGreaterThan(0)
    const slider = screen.getByRole('slider', { name: /Desplazar recta de nivel/ })
    expect(screen.getByText('z = 30')).toBeInTheDocument()
    fireEvent.change(slider, { target: { value: '6' } })
    expect(screen.getByText('z = 36')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al vértice' }))
    expect(screen.getByText('z = 30')).toBeInTheDocument()
  })

  it('marca los puntos no factibles del Símplex Dual y la dirección en el caso no acotado', () => {
    const dieta = ejemplo('dieta-dual')
    const r1 = runAll(dieta)
    const { unmount } = render(<RegionFactible2D problem={dieta} snapshots={r1.snapshots} k={0} />)
    expect(screen.getByText(/fuera de la región factible/)).toBeInTheDocument()
    expect(screen.getByText(/no acotada \(se dibuja recortada\)/)).toBeInTheDocument()
    unmount()

    const na = ejemplo('no-acotado')
    const r2 = runAll(na)
    render(<RegionFactible2D problem={na} snapshots={r2.snapshots} k={r2.snapshots.length - 1} />)
    const rayo = screen.getByTestId('direccion-no-acotada')
    expect(rayo).toBeInTheDocument()
    const dx = Number(rayo.getAttribute('x2')) - Number(rayo.getAttribute('x1'))
    const dy = Number(rayo.getAttribute('y1')) - Number(rayo.getAttribute('y2'))
    expect(dx).toBeGreaterThan(0)
    expect(dy).toBeGreaterThan(0)
    const svg = screen.getByRole('img')
    const ancho = Number(svg.getAttribute('data-ancho-plot'))
    const alto = Number(svg.getAttribute('data-alto-plot'))
    const xMax = Number(svg.getAttribute('data-xmax'))
    const yMax = Number(svg.getAttribute('data-ymax'))
    expect((dx / ancho) * xMax).toBeCloseTo((dy / alto) * yMax, 6)
  })
})
