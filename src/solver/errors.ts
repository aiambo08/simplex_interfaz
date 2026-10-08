/** Error con mensaje en español pensado para mostrarse directamente en la interfaz. */
export class SolverError extends Error {
  readonly detalles: string[]

  constructor(mensaje: string, detalles: string[] = []) {
    super(mensaje)
    this.name = 'SolverError'
    this.detalles = detalles
  }
}
