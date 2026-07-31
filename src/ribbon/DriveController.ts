import * as THREE from 'three'
import {
  boostTargetMph,
  clampCruiseMph,
  CRUISE_SPEED_LIMITS,
  mphToWorldSpeed,
  SPEED_DIAL_MAX_MPH,
} from './driveSpeed'
import type { LineLayout } from './lineLayout'

export type DrivePhase = 'driving' | 'entering' | 'exiting' | 'finished'

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
  /** Instantaneous speed shown on the dial */
  speedMph: number
  /** User-set cruise target while holding drive */
  cruiseMph: number
  /** Double-tap W boost engaged */
  boosting: boolean
}

export type DriveInput = {
  /** -1 left / +1 right (held) */
  moveX: number
  /** Double-tap W acceleration */
  boost: boolean
}

export type DriveControllerOptions = {
  /** Seconds to sink into / leave a portal */
  portalDuration?: number
  /** Seconds after a portal where edges only clamp (no re-entry) */
  edgeCooldown?: number
  /** MPH per second while accelerating toward cruise */
  accelMph?: number
  /** MPH per second while boosting */
  boostAccelMph?: number
  /** MPH per second while coasting / braking to stop */
  brakeMph?: number
}

const DEFAULTS = {
  portalDuration: 0.12,
  edgeCooldown: 0.2,
  accelMph: 55,
  boostAccelMph: 95,
  brakeMph: 70,
} as const

/** Land slightly inset so held keys resume driving instead of re-portaling. */
const LANDING_INSET = 0.04

function isDriveableLine(line: string | undefined): boolean {
  return Boolean(line && line.trim().length > 0)
}

/**
 * Player-steered car under each text line.
 * Hold left/right to drive; portals trigger only after driving past a line end.
 * Speed is MPH-based with cruise setting and double-tap boost.
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
    speedMph: 0,
    cruiseMph: CRUISE_SPEED_LIMITS.default,
    boosting: false,
  }

  private options: Required<DriveControllerOptions>
  private layout: LineLayout | null = null
  private portalTimer = 0
  private pendingLineDirection: 1 | -1 = 1
  private pendingTargetIndex: number | null = null
  private queuedJump: number | null = null
  private edgeCooldownTimer = 0
  /** Entering the end portal with nowhere left to go — vanish for good */
  private finishExit = false
  private input: DriveInput = { moveX: 0, boost: false }

  constructor(options: DriveControllerOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  setInput(input: DriveInput): void {
    this.input = input
  }

  setCruiseMph(mph: number): void {
    this.state.cruiseMph = clampCruiseMph(mph)
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

    if (this.state.phase === 'finished') {
      this.finishExit = false
      this.state.phase = 'driving'
      this.state.carScale = 1
      this.state.lift = 1
      this.state.portalBlend = 0
      this.state.speedMph = 0
      this.startJump(target)
      return
    }

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
      this.state.speedMph = 0
      this.state.boosting = false
      this.state.phase = 'driving'
      this.pendingTargetIndex = null
      this.queuedJump = null
      this.edgeCooldownTimer = 0
      this.finishExit = false
      this.input = { moveX: 0, boost: false }
    }
  }

  /** Re-enable without resetting line position (safe to call every frame). */
  ensureActive(): void {
    if (this.state.active) return
    this.state.active = true
    if (this.state.phase === 'finished') return
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
    this.state.speedMph = 0
    this.state.boosting = false
    this.portalTimer = 0
    this.pendingLineDirection = 1
    this.pendingTargetIndex = null
    this.queuedJump = null
    this.edgeCooldownTimer = 0
    this.finishExit = false
    this.input = { moveX: 0, boost: false }
    this.syncPoseFromProgress()
    this.state.lift = 1
  }

  update(delta: number): DriveState {
    if (!this.state.active || !this.layout || this.layout.lines.length === 0) {
      this.state.lift = 0
      this.state.speedMph = 0
      this.state.boosting = false
      return this.state
    }

    if (this.state.phase === 'finished') {
      this.state.carScale = 0
      this.state.lift = 0
      this.state.portalBlend = 1
      this.state.speedMph = 0
      this.state.boosting = false
      return this.state
    }

    const dt = Math.min(Math.max(delta, 0), 1 / 30)
    const { portalDuration } = this.options

    if (this.edgeCooldownTimer > 0) {
      this.edgeCooldownTimer = Math.max(0, this.edgeCooldownTimer - dt)
    }

    this.updateSpeed(dt)

    if (this.state.phase === 'driving') {
      const moveX = THREE.MathUtils.clamp(this.input.moveX, -1, 1)
      const speed = mphToWorldSpeed(this.state.speedMph)

      if (moveX !== 0 && speed > 0.001) {
        this.state.facing = moveX > 0 ? 1 : -1
        const idx = this.state.lineIndex
        const startX = this.layout.textStartXs[idx] ?? -this.layout.halfWidth
        const endX = this.layout.textEndXs[idx] ?? this.layout.halfWidth
        // Traverse only the glyph span so short lines don't pad with empty space
        const span = Math.max(0.05, endX - startX)
        // Direction from keys; magnitude from speedometer physics
        const signed = Math.sign(moveX)
        this.state.progress += (signed * speed * dt) / span

        const canPortal = this.edgeCooldownTimer <= 0
        // Trigger once the car reaches the portal — don't require a single-frame overshoot
        // (cruise acceleration often lands exactly on the edge and used to get stuck).
        if (canPortal && signed > 0 && this.state.progress >= 1) {
          this.state.progress = 1
          this.beginPortal(1)
        } else if (canPortal && signed < 0 && this.state.progress <= 0) {
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
        if (this.finishExit) {
          this.finishExit = false
          this.state.phase = 'finished'
          this.state.carScale = 0
          this.state.lift = 0
          this.state.portalBlend = 1
          this.state.speedMph = 0
          this.state.boosting = false
          this.input = { moveX: 0, boost: false }
          return this.state
        }

        const next =
          this.pendingTargetIndex ??
          this.findDriveableLine(this.state.lineIndex, this.pendingLineDirection)
        this.pendingTargetIndex = null
        this.state.lineIndex = next
        this.state.progress =
          this.pendingLineDirection > 0 ? LANDING_INSET : 1 - LANDING_INSET
        this.state.facing = this.pendingLineDirection
        this.state.phase = 'exiting'
        this.portalTimer = 0
        this.syncPoseFromProgress()
      }
    } else if (this.state.phase === 'exiting') {
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

  private updateSpeed(dt: number): void {
    const moveX = THREE.MathUtils.clamp(this.input.moveX, -1, 1)
    const driving = moveX !== 0 && this.state.phase === 'driving'
    const boosting = driving && this.input.boost && moveX > 0
    this.state.boosting = boosting

    let target = 0
    if (driving) {
      target = boosting
        ? boostTargetMph(this.state.cruiseMph)
        : this.state.cruiseMph
    }

    const { accelMph, boostAccelMph, brakeMph } = this.options
    const rate = !driving
      ? brakeMph
      : boosting
        ? boostAccelMph
        : this.state.speedMph > target
          ? brakeMph * 0.65
          : accelMph

    const diff = target - this.state.speedMph
    const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
    this.state.speedMph = THREE.MathUtils.clamp(
      this.state.speedMph + step,
      0,
      SPEED_DIAL_MAX_MPH,
    )

    if (!driving && this.state.speedMph < 0.35) {
      this.state.speedMph = 0
    }
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
    if (this.findDriveableLine(this.state.lineIndex, direction) === this.state.lineIndex) {
      // End of the book (forward): vanish into the portal instead of bouncing
      if (direction > 0) {
        this.finishExit = true
        this.pendingTargetIndex = null
        this.pendingLineDirection = direction
        this.state.phase = 'entering'
        this.portalTimer = 0
        this.state.progress = 1
        this.state.facing = 1
        this.syncPoseFromProgress()
        return
      }

      this.state.progress = THREE.MathUtils.clamp(this.state.progress, 0, 1)
      this.syncPoseFromProgress()
      this.state.lift = 1
      this.state.portalBlend = 0
      this.state.carScale = 1
      return
    }

    this.finishExit = false
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
    const { lineCenters, textStartXs, textEndXs, halfWidth } = this.layout
    const idx = THREE.MathUtils.clamp(this.state.lineIndex, 0, lineCenters.length - 1)
    const startX = textStartXs[idx] ?? -halfWidth
    const endX = textEndXs[idx] ?? halfWidth
    this.state.x = THREE.MathUtils.lerp(startX, endX, this.state.progress)
    this.state.y = lineCenters[idx] ?? 0
  }
}
