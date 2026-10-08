import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormularioGuiado } from './FormularioGuiado'

describe('FormularioGuiado', () => {
  it('construye un Problem a partir de los campos', () => {
    const onResolver = vi.fn()
    render(<FormularioGuiado onResolver={onResolver} />)
    fireEvent.change(screen.getByLabelText('Coeficiente de x1 en z'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Coeficiente de x2 en z'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Coeficiente de x1 en la restricción 1'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('Término independiente de la restricción 1'), {
      target: { value: '4' },
    })
    fireEvent.change(screen.getByLabelText('Coeficiente de x2 en la restricción 2'), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText('Término independiente de la restricción 2'), {
      target: { value: '12' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(onResolver).toHaveBeenCalledTimes(1)
    const p = onResolver.mock.calls[0]![0]
    expect(p.sentido).toBe('max')
    expect(p.c.map(String)).toEqual(['3', '5'])
    expect(p.restricciones).toHaveLength(2)
    expect(String(p.restricciones[1].b)).toBe('12')
  })

  it('muestra un error accesible si la entrada es inválida', () => {
    const onResolver = vi.fn()
    render(<FormularioGuiado onResolver={onResolver} />)
    fireEvent.change(screen.getByLabelText('Coeficiente de x1 en z'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onResolver).not.toHaveBeenCalled()
  })

  it('pasa las igualdades al solver, que es quien las rechaza (Gran M no implementado)', () => {
    const onResolver = vi.fn()
    render(<FormularioGuiado onResolver={onResolver} />)
    fireEvent.change(screen.getByLabelText('Coeficiente de x1 en z'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Coeficiente de x1 en la restricción 1'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('Relación de la restricción 1'), {
      target: { value: '=' },
    })
    fireEvent.change(screen.getByLabelText('Término independiente de la restricción 1'), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar restricción 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onResolver).toHaveBeenCalledTimes(1)
    expect(onResolver.mock.calls[0]![0].restricciones[0].rel).toBe('=')
  })

  it('ajusta el número de variables y añade restricciones', () => {
    render(<FormularioGuiado onResolver={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nº de variables'), { target: { value: '3' } })
    expect(screen.getByLabelText('Coeficiente de x3 en z')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Añadir restricción' }))
    expect(screen.getByLabelText('Coeficiente de x3 en la restricción 3')).toBeInTheDocument()
  })
})
