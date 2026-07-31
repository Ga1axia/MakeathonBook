import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { LineIndex } from '../components/LineIndex'
import {
  BOOK,
  BOOK_POSITION,
  CAMERA_RIG,
  anglesToRadians,
  type BookAngles,
  type PageScrollState,
} from './bookLayout'
import { DriveMode } from './DriveMode'
import type { DriveState } from './DriveController'
import { buildLineLayout } from './lineLayout'
import { MouseInteractionController } from './MouseInteractionController'
import { RibbonMesh } from './RibbonMesh'

export type RibbonSceneProps = {
  text: string
  angles: BookAngles
  driveMode: boolean
  /** Degrees from face-on toward a top-down view */
  cameraAngle: number
}

/**
 * Vertical book page. Hover mode lifts lines under the cursor;
 * drive mode runs a low-poly car under each line through portals.
 */
export function RibbonScene({ text, angles, driveMode, cameraAngle }: RibbonSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const jumpRequestRef = useRef<number | null>(null)
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const controller = useMemo(() => new MouseInteractionController(), [])
  const layout = useMemo(() => buildLineLayout(text), [text])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    controller.attach(element)
    return () => controller.dispose()
  }, [controller])

  return (
    <div ref={containerRef} className="ribbon-scene">
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
          driveMode={driveMode}
          cameraAngle={cameraAngle}
          controller={controller}
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

      {driveMode ? (
        <LineIndex
          lines={layout.lines}
          activeIndex={activeLineIndex}
          onSelect={(lineIndex) => {
            jumpRequestRef.current = lineIndex
          }}
        />
      ) : null}
    </div>
  )
}

function BookStage({
  text,
  angles,
  driveMode,
  cameraAngle,
  controller,
  jumpRequestRef,
  onLineIndexChange,
}: {
  text: string
  angles: BookAngles
  driveMode: boolean
  cameraAngle: number
  controller: MouseInteractionController
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
  })

  return (
    <>
      <ReadingCamera
        bookRef={bookRef}
        scrollRef={scrollRef}
        cameraAngle={cameraAngle}
        driveMode={driveMode}
      />
      <LeftPage
        bookRef={bookRef}
        scrollRef={scrollRef}
        driveRef={driveRef}
        text={text}
        angles={angles}
        driveMode={driveMode}
        controller={controller}
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
  driveMode,
}: {
  bookRef: RefObject<THREE.Group | null>
  scrollRef: RefObject<PageScrollState>
  cameraAngle: number
  driveMode: boolean
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

    const damping = driveMode ? CAMERA_RIG.scrollDamping * 1.35 : CAMERA_RIG.scrollDamping
    const alpha = 1 - Math.exp(-damping * delta)
    scroll.lookY = THREE.MathUtils.lerp(scroll.lookY, scroll.targetY, alpha)
    // Drive mode must freely follow the car; hover keeps the soft page clamp
    if (!driveMode) {
      scroll.lookY = THREE.MathUtils.clamp(
        scroll.lookY,
        CAMERA_RIG.lookBottomY,
        CAMERA_RIG.lookTopY,
      )
    }

    lookLocal.set(0, scroll.lookY, 0)
    lookWorld.copy(lookLocal).applyMatrix4(book.matrixWorld)

    pageNormal.set(0, 0, 1).transformDirection(book.matrixWorld).normalize()
    pageUp.set(0, 1, 0).transformDirection(book.matrixWorld).normalize()
    pageRight.set(1, 0, 0).transformDirection(book.matrixWorld).normalize()

    // 0° = face-on along the page normal; higher = orbit toward a top-down view
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
  driveMode,
  controller,
  jumpRequestRef,
  onLineIndexChange,
}: {
  bookRef: RefObject<THREE.Group | null>
  scrollRef: RefObject<PageScrollState>
  driveRef: RefObject<DriveState>
  text: string
  angles: BookAngles
  driveMode: boolean
  controller: MouseInteractionController
  jumpRequestRef: RefObject<number | null>
  onLineIndexChange: (lineIndex: number) => void
}) {
  const rotation = anglesToRadians(angles)

  return (
    <group ref={bookRef} position={BOOK_POSITION} rotation={rotation}>
      <RibbonMesh
        text={text}
        controller={controller}
        bookRef={bookRef}
        scrollRef={scrollRef}
        driveMode={driveMode}
        driveRef={driveRef}
      />

      <DriveMode
        text={text}
        enabled={driveMode}
        driveRef={driveRef}
        scrollRef={scrollRef}
        jumpRequestRef={jumpRequestRef}
        onLineIndexChange={onLineIndexChange}
      />
    </group>
  )
}
