import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function cargarEjemplo(nombre: RegExp) {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: nombre }))
}

describe('App', () => {
  it('muestra el título de la aplicación', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Visualizador Símplex')
  })

  it('carga un ejemplo y permite recorrer las iteraciones con el stepper y el teclado', () => {
    cargarEjemplo(/Producción \(2 variables\)/)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 0')
    expect(screen.getByRole('table', { name: /Tabla Símplex, iteración 0/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 1')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 2')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 1')

    fireEvent.click(screen.getByRole('button', { name: /Reiniciar/ }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 0')
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled()

    const selector = screen.getByRole('combobox', { name: /Ir a/ })
    const ultimo = within(selector).getAllByRole('option').length - 1
    fireEvent.change(selector, { target: { value: String(ultimo) } })
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`Iteración ${ultimo}`)
    expect(screen.getByText('✓ Óptimo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(ultimo))
  })

  it('en el ejemplo de 2 variables la tabla inicial marca x2 como variable que entra y s2 como la que sale', () => {
    cargarEjemplo(/Producción \(2 variables\)/)
    expect(screen.getByRole('columnheader', { name: 'x2, variable que entra' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 's2, variable que sale' })).toBeInTheDocument()
    expect(screen.getByLabelText('elemento pivote')).toHaveTextContent('2')
    expect(screen.getByText('← mín')).toBeInTheDocument()
  })

  it('muestra el problema original y la forma estándar', () => {
    cargarEjemplo(/Producción \(2 variables\)/)
    expect(screen.getAllByText('Maximizar z = 3x1 + 5x2')).toHaveLength(2)
    expect(screen.getByText('3x1 + 2x2 + s3 = 18')).toBeInTheDocument()
  })

  it('alterna entre fracciones y decimales', () => {
    cargarEjemplo(/Mezcla \(3 variables\)/)
    const selector = screen.getByRole('combobox', { name: /Números/ })
    fireEvent.change(selector, {
      target: { value: String(screen.getAllByRole('option', { name: /Paso/ }).length - 1) },
    })
    const irA = screen.getByRole('combobox', { name: /Ir a/ })
    fireEvent.change(irA, { target: { value: '1' } })
    expect(screen.getAllByText('5/2').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByRole('combobox', { name: /Números/ }), {
      target: { value: 'decimal' },
    })
    expect(screen.queryByText('5/2')).not.toBeInTheDocument()
    expect(screen.getAllByText('2.5').length).toBeGreaterThan(0)
  })

  it('el ejemplo con ≥ usa el Símplex Dual y muestra los cocientes por columna', () => {
    cargarEjemplo(/Dieta/)
    expect(screen.getByText('Símplex Dual')).toBeInTheDocument()
    expect(screen.getByText('Base no factible (b < 0)')).toBeInTheDocument()
    const irA = screen.getByRole('combobox', { name: /Ir a/ })
    fireEvent.change(irA, { target: { value: '1' } })
    expect(screen.getByRole('rowheader', { name: /\|z/ })).toBeInTheDocument()
    expect(screen.getByText('F_z ← −F_z')).toBeInTheDocument()
    const ultimo = within(irA).getAllByRole('option').length - 1
    fireEvent.change(irA, { target: { value: String(ultimo) } })
    expect(screen.getByText('✓ Óptimo')).toBeInTheDocument()
  })

  it('el ejemplo no acotado e infactible terminan con su estado', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /No acotado/ }))
    let irA = screen.getByRole('combobox', { name: /Ir a/ })
    fireEvent.change(irA, {
      target: { value: String(within(irA).getAllByRole('option').length - 1) },
    })
    expect(screen.getByText('∞ No acotado')).toBeInTheDocument()
    unmount()

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Infactible/ }))
    irA = screen.getByRole('combobox', { name: /Ir a/ })
    fireEvent.change(irA, {
      target: { value: String(within(irA).getAllByRole('option').length - 1) },
    })
    expect(screen.getByText('∅ Infactible')).toBeInTheDocument()
  })

  it('importa una matriz desde la pestaña Matriz directa y avisa de errores', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Matriz directa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Importar y resolver' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Usar ejemplo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Importar y resolver' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/Tabla importada directamente/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Iteración 0')
  })
})
