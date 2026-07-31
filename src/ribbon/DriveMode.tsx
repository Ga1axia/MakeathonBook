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

/** Only block keys when the user is actually typing text — not sliders/buttons. */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase()
    return (
      type === 'text' ||
      type === 'search' ||
      type === 'email' ||
      type === 'password' ||
      type === 'url' ||
      type === 'tel' ||
      type === 'number'
    )
  }
  return false
}

function keyToMove(code: string, key: string): 'forward' | 'reverse' | null {
  switch (code) {
    case 'KeyW':
    case 'KeyD':
    case 'ArrowUp':
    case 'ArrowRight':
      return 'forward'
    case 'KeyS':
    case 'KeyA':
    case 'ArrowDown':
    case 'ArrowLeft':
      return 'reverse'
    default:
      break
  }

  // Fallback for layouts where event.code is unreliable
  switch (key.toLowerCase()) {
    case 'w':
    case 'd':
    case 'arrowup':
    case 'arrowright':
      return 'forward'
    case 's':
    case 'a':
    case 'arrowdown':
    case 'arrowleft':
      return 'reverse'
    default:
      return null
  }
}

/**
 * Player-steered vector car under each line.
 * W/↑/D/→ drive forward; S/↓/A/← reverse. Line changes only via end portals or the index.
 */
export function DriveMode({
  text,
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
    controller.setActive(true)
    if (driveRef.current) Object.assign(driveRef.current, controller.state)
  }, [controller, layout, driveRef])

  useEffect(() => {
    return () => {
      controller.setActive(false)
      keysRef.current = { forward: false, reverse: false }
    }
  }, [controller])

  useEffect(() => {
    const applyKey = (event: KeyboardEvent, pressed: boolean): boolean => {
      const move = keyToMove(event.code, event.key)
      if (!move) return false
      keysRef.current[move] = pressed
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTextEntryTarget(event.target)) return
      if (applyKey(event, true)) event.preventDefault()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (applyKey(event, false)) event.preventDefault()
    }

    const clearKeys = () => {
      keysRef.current = { forward: false, reverse: false }
    }

    // Capture phase so reader controls / focused chrome can't swallow drive keys
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', clearKeys)
    }
  }, [])

  useFrame((_, delta) => {
    if (jumpRequestRef && jumpRequestRef.current !== null) {
      controller.jumpToLine(jumpRequestRef.current)
      jumpRequestRef.current = null
    }

    // Keep drive armed even if an effect race briefly deactivated it
    controller.ensureActive()

    const keys = keysRef.current
    let moveX = 0
    if (keys.forward) moveX += 1
    if (keys.reverse) moveX -= 1

    controller.setInput({ moveX })
    const state = controller.update(delta)
    if (driveRef.current) Object.assign(driveRef.current, state)

    if (state.lineIndex !== lastReportedLine.current) {
      lastReportedLine.current = state.lineIndex
      onLineIndexChangeRef.current?.(state.lineIndex)
    }

    const laneY = state.y - layout.ribbonHeight / 2 - layout.gap / 2

    if (scrollRef.current) {
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
