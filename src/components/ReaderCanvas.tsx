import { RibbonScene } from '../ribbon/RibbonScene'
import type { BookAngles } from '../ribbon/bookLayout'

type ReaderCanvasProps = {
  text: string
  angles: BookAngles
  cameraAngle: number
  driveMode: boolean
}

/**
 * Full-bleed 3D reading surface wrapper.
 */
export function ReaderCanvas({
  text,
  angles,
  cameraAngle,
  driveMode,
}: ReaderCanvasProps) {
  return (
    <div className="reader-canvas">
      <RibbonScene
        text={text}
        angles={angles}
        cameraAngle={cameraAngle}
        driveMode={driveMode}
      />
    </div>
  )
}
