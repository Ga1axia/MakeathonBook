import { useMemo } from 'react'
import * as THREE from 'three'

type VectorPortalProps = {
  radius?: number
}

/**
 * Thin black vector circle, standing vertically so the car can drive through.
 * Circle lies in the YZ plane (facing ±X); bottom rests on the page (z = 0).
 */
export function SwirlPortal({ radius = 0.16 }: VectorPortalProps) {
  const geometry = useMemo(() => {
    const segments = 48
    const points: THREE.Vector3[] = []
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2
      // YZ plane, centered so the bottom of the circle sits on z = 0
      points.push(
        new THREE.Vector3(0, Math.cos(a) * radius, radius + Math.sin(a) * radius),
      )
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#111111',
        depthTest: true,
      }),
    [],
  )

  return <lineLoop geometry={geometry} material={material} />
}

/** Alias matching the simpler mental model */
export const VectorPortal = SwirlPortal
