import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import * as THREE from 'three'
import { BOOK, type PageScrollState } from './bookLayout'
import { CanvasTextureRenderer } from './CanvasTextureRenderer'
import type { DriveState } from './DriveController'
import { buildLineLayout } from './lineLayout'
import { MouseInteractionController } from './MouseInteractionController'

export type RibbonMeshProps = {
  text: string
  controller: MouseInteractionController
  bookRef: RefObject<THREE.Group | null>
  scrollRef: RefObject<PageScrollState>
  driveMode?: boolean
  driveRef?: RefObject<DriveState>
}

type CursorState = {
  x: number
  y: number
  lift: number
  activeIndex: number
}

/**
 * Stack of horizontal text ribbons. Lift comes from the mouse, or from the
 * drive-mode car when that mode is enabled.
 */
export function RibbonMesh({
  text,
  controller,
  bookRef,
  scrollRef,
  driveMode = false,
  driveRef,
}: RibbonMeshProps) {
  const layout = useMemo(() => buildLineLayout(text), [text])
  const { width, ribbonHeight, lineCenters, lines } = layout
  const { maxLift, ellipseX, ellipseY, neighborLift } = BOOK

  const hitPoint = useMemo(() => new THREE.Vector3(), [])
  const localHit = useMemo(() => new THREE.Vector3(), [])
  const pageNormal = useMemo(() => new THREE.Vector3(), [])
  const pagePoint = useMemo(() => new THREE.Vector3(), [])
  const plane = useMemo(() => new THREE.Plane(), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const { camera } = useThree()

  const cursorRef = useRef<CursorState>({
    x: 0,
    y: 0,
    lift: 0,
    activeIndex: 0,
  })

  useFrame((_, delta) => {
    // delta reserved for controller easing
    const state = controller.update(delta)
    const book = bookRef.current
    if (!book) return

    if (driveMode && driveRef?.current?.active) {
      const drive = driveRef.current
      cursorRef.current.x = drive.x
      cursorRef.current.y = drive.y
      cursorRef.current.activeIndex = drive.lineIndex
      cursorRef.current.lift = drive.lift
      return
    }

    pageNormal.set(0, 0, 1).transformDirection(book.matrixWorld)
    pagePoint.set(0, 0, 0).applyMatrix4(book.matrixWorld)
    plane.setFromNormalAndCoplanarPoint(pageNormal, pagePoint)

    raycaster.setFromCamera(state.pointer, camera)
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      localHit.copy(hitPoint)
      book.worldToLocal(localHit)
      cursorRef.current.x = localHit.x
      cursorRef.current.y = localHit.y

      let nearest = 0
      let nearestDist = Infinity
      for (let i = 0; i < lineCenters.length; i++) {
        const d = Math.abs(localHit.y - lineCenters[i])
        if (d < nearestDist) {
          nearestDist = d
          nearest = i
        }
      }
      cursorRef.current.activeIndex = nearest

      if (scrollRef.current && state.hovering && lineCenters.length > 0) {
        scrollRef.current.targetY = lineCenters[nearest]
      }
    }
    cursorRef.current.lift = state.lift
  })

  return (
    <group position={[0, 0, 0.01]}>
      {lines.map((line, index) => (
        <TextRibbon
          key={`${index}-${line.slice(0, 24)}`}
          line={line}
          index={index}
          y={lineCenters[index]}
          width={width}
          ribbonHeight={ribbonHeight}
          maxLift={driveMode ? maxLift * 0.32 : maxLift}
          ellipseX={driveMode ? 0.7 : ellipseX}
          ellipseY={ellipseY}
          neighborLift={driveMode ? 0.08 : neighborLift}
          cursorRef={cursorRef}
        />
      ))}
    </group>
  )
}

type TextRibbonProps = {
  line: string
  index: number
  y: number
  width: number
  ribbonHeight: number
  maxLift: number
  ellipseX: number
  ellipseY: number
  neighborLift: number
  cursorRef: MutableRefObject<CursorState>
}

function TextRibbon({
  line,
  index,
  y,
  width,
  ribbonHeight,
  maxLift,
  ellipseX,
  ellipseY,
  neighborLift,
  cursorRef,
}: TextRibbonProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const textureRenderer = useMemo(
    () =>
      new CanvasTextureRenderer({
        width: BOOK.textureWidth,
        height: BOOK.textureHeight,
        fontSize: BOOK.fontSize,
      }),
    [],
  )
  const restPositions = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, ribbonHeight, 96, 3)
    return new Float32Array(geo.attributes.position.array as Float32Array)
  }, [width, ribbonHeight])

  useEffect(() => {
    textureRenderer.setText(line)
  }, [line, textureRenderer])

  useEffect(() => {
    return () => textureRenderer.dispose()
  }, [textureRenderer])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const { x: peakX, y: cursorY, lift, activeIndex } = cursorRef.current
    const indexDelta = Math.abs(index - activeIndex)
    const lineWeight = indexDelta === 0 ? 1 : indexDelta === 1 ? neighborLift : 0

    deformHorizontalRibbon(
      mesh,
      restPositions,
      width,
      y,
      peakX,
      cursorY,
      lift * lineWeight,
      maxLift,
      ellipseX,
      ellipseY,
    )
  })

  return (
    <mesh ref={meshRef} position={[0, y, 0]} castShadow>
      <planeGeometry args={[width, ribbonHeight, 96, 3]} />
      <meshStandardMaterial
        map={textureRenderer.texture}
        transparent
        alphaTest={0.45}
        depthWrite
        roughness={0.92}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function deformHorizontalRibbon(
  mesh: THREE.Mesh,
  rest: Float32Array,
  ribbonWidth: number,
  ribbonCenterY: number,
  peakX: number,
  cursorY: number,
  strength: number,
  maxLift: number,
  ellipseX: number,
  ellipseY: number,
): void {
  const geometry = mesh.geometry as THREE.PlaneGeometry
  const position = geometry.attributes.position as THREE.BufferAttribute
  const halfW = ribbonWidth / 2
  const clampedPeak = THREE.MathUtils.clamp(peakX, -halfW, halfW)
  const rx = Math.max(0.25, ellipseX)
  const ry = Math.max(0.06, ellipseY)

  if (strength < 0.001) {
    for (let i = 0; i < position.count; i++) {
      const ix = i * 3
      position.setXYZ(i, rest[ix], rest[ix + 1], 0)
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
    return
  }

  for (let i = 0; i < position.count; i++) {
    const ix = i * 3
    const x0 = rest[ix]
    const y0 = rest[ix + 1]

    const dx = (x0 - clampedPeak) / rx
    const dy = (ribbonCenterY + y0 - cursorY) / ry
    const ellipse = Math.exp(-0.5 * (dx * dx + dy * dy))
    const z = ellipse * strength * maxLift

    position.setXYZ(i, x0, y0, z)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}
