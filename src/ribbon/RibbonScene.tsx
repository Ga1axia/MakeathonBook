import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { LineIndex } from '../components/LineIndex'
import { Speedometer, type SpeedTelemetry } from '../components/Speedometer'
import {
  BOOK,
  BOOK_POSITION,
  CAMERA_RIG,
  anglesToRadians,
  type BookAngles,
  type PageScrollState,
} from './bookLayout'
import { CRUISE_SPEED_LIMITS } from './driveSpeed'
import { DriveMode } from './DriveMode'
import type { DriveState } from './DriveController'
import { buildLineLayout } from './lineLayout'
import { RibbonMesh } from './RibbonMesh'

export type RibbonSceneProps = {
  text: string
  angles: BookAngles
  /** Degrees from face-on toward a top-down view */
  cameraAngle: number
  cruiseMph: number
  onCruiseChange: (mph: number) => void
}

/**
 * Vertical book page with drive-to-read: a car runs under each line through portals.
 */
export function RibbonScene({
  text,
  angles,
  cameraAngle,
  cruiseMph,
  onCruiseChange,
}: RibbonSceneProps) {
  const jumpRequestRef = useRef<number | null>(null)
  const telemetryRef = useRef<SpeedTelemetry>({
    mph: 0,
    cruiseMph: CRUISE_SPEED_LIMITS.default,
    boosting: false,
  })
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const layout = useMemo(() => buildLineLayout(text), [text])

  return (
    <div className="ribbon-scene">
      <Canvas
        shadows
        camera={{
          position: [0, 0.4, 8],
          fov: CAMERA_RIG.fov,
          near: 0.1,
          far: 60,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[BOOK.sceneBackground]} />
        <ambientLight intensity={0.76} />
        <directionalLight
          castShadow
          position={[-2.4, 4.5, 6]}
          intensity={1.15}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={24}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
        />
        <directionalLight position={[3.2, 1.5, 2]} intensity={0.28} color="#d9dde6" />
        <BookStage
          text={text}
          angles={angles}
          cameraAngle={cameraAngle}
          cruiseMph={cruiseMph}
          telemetryRef={telemetryRef}
          jumpRequestRef={jumpRequestRef}
          onLineIndexChange={setActiveLineIndex}
        />
        <ContactShadows
          position={[0, -BOOK.pageHeight * 0.52, 0]}
          opacity={0.2}
          scale={14}
          blur={2.8}
          far={12}
          color="#3a3732"
        />
      </Canvas>

      <Speedometer
        telemetryRef={telemetryRef}
        cruiseMph={cruiseMph}
        onCruiseChange={onCruiseChange}
      />

      <LineIndex
        lines={layout.lines}
        activeIndex={activeLineIndex}
        onSelect={(lineIndex) => {
          jumpRequestRef.current = lineIndex
        }}
      />
    </div>
  )
}

function BookStage({
  text,
  angles,
  cameraAngle,
  cruiseMph,
  telemetryRef,
  jumpRequestRef,
  onLineIndexChange,
}: {
  text: string
  angles: BookAngles
  cameraAngle: number
  cruiseMph: number
  telemetryRef: RefObject<SpeedTelemetry>
  jumpRequestRef: RefObject<number | null>
  onLineIndexChange: (lineIndex: number) => void
}) {
  const bookRef = useRef<THREE.Group>(null)
  const scrollRef = useRef<PageScrollState>({
    lookY: CAMERA_RIG.lookTopY,
    targetY: CAMERA_RIG.lookTopY,
  })
  const driveRef = useRef<DriveState>({
    active: false,
    phase: 'driving',
    x: 0,
    y: 0,
    lineIndex: 0,
    progress: 0,
    lift: 0,
    portalBlend: 0,
    carScale: 1,
    facing: 1,
    speedMph: 0,
    cruiseMph: CRUISE_SPEED_LIMITS.default,
    boosting: false,
  })

  return (
    <>
      <ReadingCamera
        bookRef={bookRef}
        scrollRef={scrollRef}
        cameraAngle={cameraAngle}
      />
      <LeftPage
        bookRef={bookRef}
        scrollRef={scrollRef}
        driveRef={driveRef}
        text={text}
        angles={angles}
        cruiseMph={cruiseMph}
        telemetryRef={telemetryRef}
        jumpRequestRef={jumpRequestRef}
        onLineIndexChange={onLineIndexChange}
      />
    </>
  )
}

function ReadingCamera({
  bookRef,
  scrollRef,
  cameraAngle,
}: {
  bookRef: RefObject<THREE.Group | null>
  scrollRef: RefObject<PageScrollState>
  cameraAngle: number
}) {
  const { camera } = useThree()
  const lookLocal = useMemo(() => new THREE.Vector3(), [])
  const lookWorld = useMemo(() => new THREE.Vector3(), [])
  const pageNormal = useMemo(() => new THREE.Vector3(), [])
  const pageUp = useMemo(() => new THREE.Vector3(), [])
  const pageRight = useMemo(() => new THREE.Vector3(), [])
  const desiredPos = useMemo(() => new THREE.Vector3(), [])
  const angleRef = useRef(cameraAngle)
  angleRef.current = cameraAngle

  useFrame((_, delta) => {
    const book = bookRef.current
    const scroll = scrollRef.current
    if (!book || !scroll) return

    book.updateWorldMatrix(true, false)

    const alpha = 1 - Math.exp(-CAMERA_RIG.scrollDamping * 1.35 * delta)
    scroll.lookY = THREE.MathUtils.lerp(scroll.lookY, scroll.targetY, alpha)

    lookLocal.set(0, scroll.lookY, 0)
    lookWorld.copy(lookLocal).applyMatrix4(book.matrixWorld)

    pageNormal.set(0, 0, 1).transformDirection(book.matrixWorld).normalize()
    pageUp.set(0, 1, 0).transformDirection(book.matrixWorld).normalize()
    pageRight.set(1, 0, 0).transformDirection(book.matrixWorld).normalize()

    const pitch = THREE.MathUtils.degToRad(angleRef.current)
    const dist = CAMERA_RIG.distance
    desiredPos
      .copy(lookWorld)
      .addScaledVector(pageNormal, dist * Math.cos(pitch))
      .addScaledVector(pageUp, dist * Math.sin(pitch))
      .addScaledVector(pageRight, CAMERA_RIG.acrossPage)

    camera.position.lerp(desiredPos, 1 - Math.exp(-3.5 * delta))
    camera.up.set(0, 1, 0)
    camera.lookAt(lookWorld)
  })

  return null
}

function LeftPage({
  bookRef,
  scrollRef,
  driveRef,
  text,
  angles,
  cruiseMph,
  telemetryRef,
  jumpRequestRef,
  onLineIndexChange,
}: {
  bookRef: RefObject<THREE.Group | null>
  scrollRef: RefObject<PageScrollState>
  driveRef: RefObject<DriveState>
  text: string
  angles: BookAngles
  cruiseMph: number
  telemetryRef: RefObject<SpeedTelemetry>
  jumpRequestRef: RefObject<number | null>
  onLineIndexChange: (lineIndex: number) => void
}) {
  const rotation = anglesToRadians(angles)

  return (
    <group ref={bookRef} position={BOOK_POSITION} rotation={rotation}>
      <RibbonMesh text={text} driveRef={driveRef} />

      <DriveMode
        text={text}
        driveRef={driveRef}
        scrollRef={scrollRef}
        jumpRequestRef={jumpRequestRef}
        onLineIndexChange={onLineIndexChange}
        cruiseMph={cruiseMph}
        telemetryRef={telemetryRef}
      />
    </group>
  )
}
