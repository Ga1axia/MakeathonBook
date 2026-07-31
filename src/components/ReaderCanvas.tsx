import { RibbonScene } from '../ribbon/RibbonScene'
import type { BookAngles } from '../ribbon/bookLayout'

type ReaderCanvasProps = {
  text: string
  angles: BookAngles
  cameraAngle: number
}

/**
 * Full-bleed drive-to-read surface.
 */
export function ReaderCanvas({ text, angles, cameraAngle }: ReaderCanvasProps) {
  return (
    <div className="reader-canvas">
      <RibbonScene text={text} angles={angles} cameraAngle={cameraAngle} />
    </div>
  )
}
