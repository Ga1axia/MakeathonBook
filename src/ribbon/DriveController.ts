import * as THREE from 'three'
import type { LineLayout } from './lineLayout'

export type DrivePhase = 'driving' | 'entering' | 'exiting'

export type DriveState = {
  active: boolean
  phase: DrivePhase
  /** Page-local X under the current line */
  x: number
  /** Page-local Y of the current line center */
  y: number
  lineIndex: number
  /** 0..1 progress across the current line */
  progress: number
  /** Lift strength for the ribbon under the car */
  lift: number
  /** 0..1 while vanishing into / emerging from a portal */
  portalBlend: number
  /** Car scale during portal transit */
  carScale: number
  /** Facing: +1 right, -1 left */
  facing: number
}

export type DriveInput = {
  /** -1 left / +1 right (held) */
  moveX: number
}

export type DriveControllerOptions = {
  /** World units per second across a line while holding a key */
  speed?: number
  /** Seconds to sink into / leave a portal */
  portalDuration?: number
  /** Seconds after a portal where edges only clamp (no re-entry) */
  edgeCooldown?: number
}

const DEFAULTS = {
  speed: 2.1,
  portalDuration: 0.28,
  edgeCooldown: 0.2,
} as const

/** How far past an edge counts as entering a portal (progress units). */
const PORTAL_OVERSHOOT = 0.02
/** Land slightly inset so held keys resume driving instead of re-portaling. */
const LANDING_INSET = 0.04

function isDriveableLine(line: string | undefined): boolean {
  return Boolean(line && line.trim().length > 0)
}

/**
 * Player-steered car under each text line.
 * Hold left/right to drive; portals trigger only after driving past a line end.
 */
export class DriveController {
  readonly state: DriveState = {
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
  }

  private options: Required<DriveControllerOptions>
  private layout: LineLayout | null = null
  private portalTimer = 0
  private pendingLineDirection: 1 | -1 = 1
  private pendingTargetIndex: number | null = null
  private queuedJump: number | null = null
  private edgeCooldownTimer = 0
  private input: DriveInput = { moveX: 0 }

  constructor(options: DriveControllerOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  setInput(input: DriveInput): void {
    this.input = input
  }

  /**
   * Portal-jump to a specific line index (blank lines resolve to the next driveable).
   */
  jumpToLine(targetIndex: number): void {
    if (!this.layout || !this.state.active || this.layout.lines.length === 0) return

    const clamped = THREE.MathUtils.clamp(targetIndex, 0, this.layout.lines.length - 1)
    const target = isDriveableLine(this.layout.lines[clamped])
      ? clamped
      : this.findDriveableLine(clamped, 1, true)

    if (this.state.phase !== 'driving') {
      this.queuedJump = target
      return
    }

    this.startJump(target)
  }

  setActive(active: boolean): void {
    if (active === this.state.active) return

    this.state.active = active
    if (active) {
      this.resetToStart()
    } else {
      this.state.lift = 0
      this.state.portalBlend = 0
      this.state.carScale = 1
      this.state.phase = 'driving'
      this.pendingTargetIndex = null
      this.queuedJump = null
      this.edgeCooldownTimer = 0
      this.input = { moveX: 0 }
    }
  }

  /** Re-enable without resetting line position (safe to call every frame). */
  ensureActive(): void {
    if (this.state.active) return
    this.state.active = true
    if (this.layout) {
      this.syncPoseFromProgress()
      this.state.lift = 1
      this.state.carScale = 1
      this.state.phase = 'driving'
    } else {
      this.resetToStart()
    }
  }

  setLayout(layout: LineLayout): void {
    this.layout = layout
    if (!this.state.active) return

    if (!isDriveableLine(layout.lines[this.state.lineIndex])) {
      const next = this.findDriveableLine(this.state.lineIndex, 1)
      this.state.lineIndex = next
      this.state.progress = LANDING_INSET
    } else {
      this.state.lineIndex = THREE.MathUtils.clamp(
        this.state.lineIndex,
        0,
        Math.max(0, layout.lines.length - 1),
      )
    }
    this.syncPoseFromProgress()
  }

  resetToStart(): void {
    this.state.lineIndex = this.findDriveableLine(0, 1, true)
    this.state.progress = LANDING_INSET
    this.state.phase = 'driving'
    this.state.portalBlend = 0
    this.state.carScale = 1
    this.state.facing = 1
    this.portalTimer = 0
    this.pendingLineDirection = 1
    this.pendingTargetIndex = null
    this.queuedJump = null
    this.edgeCooldownTimer = 0
    this.input = { moveX: 0 }
    this.syncPoseFromProgress()
    this.state.lift = 1
  }

  update(delta: number): DriveState {
    if (!this.state.active || !this.layout || this.layout.lines.length === 0) {
      this.state.lift = 0
      return this.state
    }

    const dt = Math.min(Math.max(delta, 0), 1 / 30)
    const { speed, portalDuration } = this.options

    if (this.edgeCooldownTimer > 0) {
      this.edgeCooldownTimer = Math.max(0, this.edgeCooldownTimer - dt)
    }

    if (this.state.phase === 'driving') {
      const moveX = THREE.MathUtils.clamp(this.input.moveX, -1, 1)
      if (moveX !== 0) {
        this.state.facing = moveX > 0 ? 1 : -1
        const span = this.layout.width
        const prev = this.state.progress
        this.state.progress += (moveX * speed * dt) / Math.max(0.001, span)

        const canPortal = this.edgeCooldownTimer <= 0
        const crossedRight = prev < 1 && this.state.progress >= 1 + PORTAL_OVERSHOOT
        const crossedLeft = prev > 0 && this.state.progress <= -PORTAL_OVERSHOOT

        if (canPortal && moveX > 0 && crossedRight) {
          this.state.progress = 1
          this.beginPortal(1)
        } else if (canPortal && moveX < 0 && crossedLeft) {
          this.state.progress = 0
          this.beginPortal(-1)
        } else {
          this.state.progress = THREE.MathUtils.clamp(this.state.progress, 0, 1)
        }
      }

      if (this.state.phase === 'driving') {
        this.syncPoseFromProgress()
        this.state.lift = 1
        this.state.portalBlend = 0
        this.state.carScale = 1
      }
    } else if (this.state.phase === 'entering') {
      this.portalTimer += dt
      const t = Math.min(1, this.portalTimer / portalDuration)
      this.state.portalBlend = t
      this.state.carScale = 1 - t
      this.state.lift = 1 - t * 0.85
      this.syncPoseFromProgress()

      if (t >= 1) {
        const next =
          this.pendingTargetIndex ??
          this.findDriveableLine(this.state.lineIndex, this.pendingLineDirection)
        this.pendingTargetIndex = null
        this.state.lineIndex = next
        // Enter next line from the side matching travel direction, slightly inset
        this.state.progress =
          this.pendingLineDirection > 0 ? LANDING_INSET : 1 - LANDING_INSET
        this.state.facing = this.pendingLineDirection
        this.state.phase = 'exiting'
        this.portalTimer = 0
        this.syncPoseFromProgress()
      }
    } else {
      // exiting
      this.portalTimer += dt
      const t = Math.min(1, this.portalTimer / portalDuration)
      this.state.portalBlend = 1 - t
      this.state.carScale = t
      this.state.lift = t
      this.syncPoseFromProgress()

      if (t >= 1) {
        this.state.phase = 'driving'
        this.state.portalBlend = 0
        this.state.carScale = 1
        this.state.lift = 1
        this.edgeCooldownTimer = this.options.edgeCooldown

        if (this.queuedJump !== null) {
          const nextJump = this.queuedJump
          this.queuedJump = null
          this.startJump(nextJump)
        }
      }
    }

    return this.state
  }

  private startJump(target: number): void {
    if (!this.layout) return

    if (target === this.state.lineIndex) {
      this.state.progress = LANDING_INSET
      this.state.facing = 1
      this.syncPoseFromProgress()
      this.state.lift = 1
      this.state.portalBlend = 0
      this.state.carScale = 1
      return
    }

    this.pendingTargetIndex = target
    this.pendingLineDirection = target > this.state.lineIndex ? 1 : -1
    this.state.phase = 'entering'
    this.portalTimer = 0
    this.state.progress = this.pendingLineDirection > 0 ? 1 : 0
    this.state.facing = this.pendingLineDirection
    this.syncPoseFromProgress()
  }

  private beginPortal(direction: 1 | -1): void {
    if (!this.layout) return
    // No other driveable line — stay put
    if (this.findDriveableLine(this.state.lineIndex, direction) === this.state.lineIndex) {
      this.state.progress = THREE.MathUtils.clamp(this.state.progress, 0, 1)
      this.syncPoseFromProgress()
      this.state.lift = 1
      this.state.portalBlend = 0
      this.state.carScale = 1
      return
    }

    this.pendingTargetIndex = null
    this.pendingLineDirection = direction
    this.state.phase = 'entering'
    this.portalTimer = 0
    this.state.progress = direction > 0 ? 1 : 0
    this.state.facing = direction
    this.syncPoseFromProgress()
  }

  /**
   * Next (or previous) line with real text. Blank / whitespace-only lines are skipped.
   * Does not wrap — returns `from` when the edge of the page is reached.
   * When `includeStart` is true, prefer `from` itself if driveable.
   */
  private findDriveableLine(
    from: number,
    direction: 1 | -1,
    includeStart = false,
  ): number {
    if (!this.layout || this.layout.lines.length === 0) return 0
    const n = this.layout.lines.length
    const start = THREE.MathUtils.clamp(from, 0, n - 1)

    if (includeStart && isDriveableLine(this.layout.lines[start])) {
      return start
    }

    for (let step = 1; step < n; step++) {
      const idx = start + direction * step
      if (idx < 0 || idx >= n) break
      if (isDriveableLine(this.layout.lines[idx])) return idx
    }

    return start
  }

  private syncPoseFromProgress(): void {
    if (!this.layout) return
    const { halfWidth, lineCenters } = this.layout
    const idx = THREE.MathUtils.clamp(this.state.lineIndex, 0, lineCenters.length - 1)
    this.state.x = THREE.MathUtils.lerp(-halfWidth, halfWidth, this.state.progress)
    this.state.y = lineCenters[idx] ?? 0
  }
}
