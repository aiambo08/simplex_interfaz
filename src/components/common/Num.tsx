import { formatFrac, type Frac } from '../../solver'
import { useFormato } from '../../state/formato'

export function Num({ v, className }: { v: Frac; className?: string }) {
  const { modo } = useFormato()
  const texto = formatFrac(v, modo)
  const title = modo === 'fraccion' ? formatFrac(v, 'decimal', 4) : formatFrac(v, 'fraccion')
  return (
    <span className={className} title={title}>
      {texto}
    </span>
  )
}
