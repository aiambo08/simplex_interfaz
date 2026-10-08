import { createContext, useContext } from 'react'
import type { ModoFormato } from '../solver'

export interface FormatoContexto {
  modo: ModoFormato
  setModo: (m: ModoFormato) => void
}

export const FormatoContext = createContext<FormatoContexto>({
  modo: 'fraccion',
  setModo: () => undefined,
})

export function useFormato(): FormatoContexto {
  return useContext(FormatoContext)
}
