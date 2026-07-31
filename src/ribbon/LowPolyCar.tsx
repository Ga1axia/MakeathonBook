import { useMemo } from 'react'
import * as THREE from 'three'

const INK = '#111111'

/**
 * Thin vector wireframe car.
 * +X travel, +Y width, +Z up from the page — readable from the side and from above.
 * Wheel bottoms sit on z = 0.
 */
export function LowPolyCar() {
  const wheelR = 0.026
  const halfW = 0.055
  const stroke = useMemo(() => makeLineMaterial(), [])

  const chassis = useMemo(() => boxEdges(0.26, halfW * 2, 0.04), [])
  const cabin = useMemo(() => boxEdges(0.12, halfW * 1.6, 0.045), [])
  const hood = useMemo(() => boxEdges(0.08, halfW * 1.7, 0.02), [])
  const wheelGeom = useMemo(() => circleLoop(wheelR, 24), [])
  const spokes = useMemo(() => wheelSpokes(wheelR), [])
  const roofLines = useMemo(() => topDeckLines(halfW), [])

  const axleZ = wheelR
  const chassisZ = axleZ + 0.028
  const cabinZ = chassisZ + 0.042
  const hoodZ = chassisZ + 0.022

  return (
    <group>
      <lineSegments
        geometry={chassis}
        material={stroke}
        position={[0.01, 0, chassisZ]}
      />
      <lineSegments
        geometry={cabin}
        material={stroke}
        position={[-0.02, 0, cabinZ]}
      />
      <lineSegments
        geometry={hood}
        material={stroke}
        position={[0.1, 0, hoodZ]}
      />
      {/* Roof rectangle readable from above */}
      <lineSegments geometry={roofLines} material={stroke} position={[0, 0, cabinZ + 0.022]} />

      <Wheel pairY={halfW} x={0.09} z={axleZ} geom={wheelGeom} spokes={spokes} stroke={stroke} />
      <Wheel pairY={halfW} x={-0.08} z={axleZ} geom={wheelGeom} spokes={spokes} stroke={stroke} />
    </group>
  )
}

function Wheel({
  pairY,
  x,
  z,
  geom,
  spokes,
  stroke,
}: {
  pairY: number
  x: number
  z: number
  geom: THREE.BufferGeometry
  spokes: THREE.BufferGeometry
  stroke: THREE.LineBasicMaterial
}) {
  return (
    <group>
      {/* Left + right wheels in XZ planes */}
      <group position={[x, pairY, z]}>
        <lineLoop geometry={geom} material={stroke} />
        <lineSegments geometry={spokes} material={stroke} />
      </group>
      <group position={[x, -pairY, z]}>
        <lineLoop geometry={geom} material={stroke} />
        <lineSegments geometry={spokes} material={stroke} />
      </group>
      {/* Axle across — visible from above */}
      <lineSegments
        geometry={segment(new THREE.Vector3(x, -pairY, z), new THREE.Vector3(x, pairY, z))}
        material={stroke}
      />
    </group>
  )
}

function makeLineMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: INK, depthTest: true })
}

function boxEdges(w: number, h: number, d: number): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(w, h, d)
  const edges = new THREE.EdgesGeometry(box)
  box.dispose()
  return edges
}

function circleLoop(radius: number, segments: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    // Circle in XZ (side of car)
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function wheelSpokes(radius: number): THREE.BufferGeometry {
  const r = radius * 0.8
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(0, 0, -r),
    new THREE.Vector3(0, 0, r),
  ])
}

/** Flat roof / window frame in XY — reads clearly from above. */
function topDeckLines(halfW: number): THREE.BufferGeometry {
  const x0 = -0.08
  const x1 = 0.04
  const y0 = -halfW * 0.75
  const y1 = halfW * 0.75
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x0, y0, 0),
    new THREE.Vector3(x1, y0, 0),
    new THREE.Vector3(x1, y0, 0),
    new THREE.Vector3(x1, y1, 0),
    new THREE.Vector3(x1, y1, 0),
    new THREE.Vector3(x0, y1, 0),
    new THREE.Vector3(x0, y1, 0),
    new THREE.Vector3(x0, y0, 0),
    // windshield crease
    new THREE.Vector3(0.01, y0, 0),
    new THREE.Vector3(0.01, y1, 0),
  ])
}

function segment(a: THREE.Vector3, b: THREE.Vector3): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints([a, b])
}
