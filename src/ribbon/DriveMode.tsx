import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { CAMERA_RIG, type PageScrollState } from './bookLayout'
import { DriveController, type DriveState } from './DriveController'
import { LowPolyCar } from './LowPolyCar'
import { buildLineLayout } from './lineLayout'
import { SwirlPortal } from './SwirlPortal'

export type DriveModeProps = {
  text: string
  enabled: boolean
  driveRef: RefObject<DriveState>
  scrollRef: RefObject<PageScrollState>
  /** Set to a line index to request a portal jump; cleared after handling */
  jumpRequestRef?: RefObject<number | null>
  onLineIndexChange?: (lineIndex: number) => void
}

type KeyFlags = {
  forward: boolean
  reverse: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Player-steered vector car under each line.
 * W/↑/D/→ drive forward; S/↓/A/← reverse. Line changes only via end portals or the index.
 */
export function DriveMode({
  text,
  enabled,
  driveRef,
  scrollRef,
  jumpRequestRef,
  onLineIndexChange,
}: DriveModeProps) {
  const controller = useMemo(() => new DriveController(), [])
  const carGroup = useRef<THREE.Group>(null)
  const endPortal = useRef<THREE.Group>(null)
  const startPortal = useRef<THREE.Group>(null)
  const keysRef = useRef<KeyFlags>({
    forward: false,
    reverse: false,
  })
  const lastReportedLine = useRef(-1)
  const onLineIndexChangeRef = useRef(onLineIndexChange)
  onLineIndexChangeRef.current = onLineIndexChange

  const layout = useMemo(() => buildLineLayout(text), [text])

  useEffect(() => {
    controller.setLayout(layout)
  }, [controller, layout])

  useEffect(() => {
    controller.setActive(enabled)
    if (driveRef.current) Object.assign(driveRef.current, controller.state)
    if (!enabled) {
      keysRef.current = { forward: false, reverse: false }
    }
  }, [controller, enabled, driveRef])

  useEffect(() => {
    if (!enabled) return

    const applyKey = (code: string, pressed: boolean): boolean => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.forward = pressed
          return true
        case 'KeyS':
        case 'ArrowDown':
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.reverse = pressed
          return true
        default:
          return false
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (applyKey(event.code, true)) event.preventDefault()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (applyKey(event.code, false)) event.preventDefault()
    }

    const clearKeys = () => {
      keysRef.current = { forward: false, reverse: false }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
    }
  }, [enabled])

  useFrame((_, delta) => {
    if (jumpRequestRef && jumpRequestRef.current !== null) {
      controller.jumpToLine(jumpRequestRef.current)
      jumpRequestRef.current = null
    }

    const keys = keysRef.current
    let moveX = 0
    if (keys.forward) moveX += 1
    if (keys.reverse) moveX -= 1

    controller.setInput({ moveX, lineStep: 0 })
    const state = controller.update(delta)
    if (driveRef.current) Object.assign(driveRef.current, state)

    if (enabled && state.lineIndex !== lastReportedLine.current) {
      lastReportedLine.current = state.lineIndex
      onLineIndexChangeRef.current?.(state.lineIndex)
    }

    if (!enabled) return

    // Ride in the open lane between this line and the next
    const laneY = state.y - layout.ribbonHeight / 2 - layout.gap / 2

    if (scrollRef.current) {
      // Frame the car at ~3/4 down the viewport by looking slightly above it
      const halfFov = THREE.MathUtils.degToRad(CAMERA_RIG.fov * 0.5)
      const halfHeight = CAMERA_RIG.distance * Math.tan(halfFov)
      const ndcY = 1 - 2 * CAMERA_RIG.driveCarScreenY
      scrollRef.current.targetY = laneY - ndcY * halfHeight
    }

    if (carGroup.current) {
      carGroup.current.position.set(state.x, laneY, 0.002)
      carGroup.current.scale.setScalar(Math.max(0.001, state.carScale))
      carGroup.current.rotation.z = state.facing < 0 ? Math.PI : 0
      carGroup.current.visible = state.carScale > 0.02
    }

    const half = layout.halfWidth
    if (endPortal.current) {
      endPortal.current.position.set(half + 0.06, laneY, 0.002)
      endPortal.current.visible = true
    }
    if (startPortal.current) {
      startPortal.current.position.set(-half - 0.06, laneY, 0.002)
      startPortal.current.visible = true
    }
  })

  if (!enabled) return null

  return (
    <group>
      <group ref={carGroup}>
        <LowPolyCar />
      </group>

      <group ref={endPortal}>
        <SwirlPortal radius={0.15} />
      </group>
      <group ref={startPortal}>
        <SwirlPortal radius={0.15} />
      </group>
    </group>
  )
}
