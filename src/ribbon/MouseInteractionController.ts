import * as THREE from 'three'

export type MouseInteractionState = {
  /** Smoothed pointer in normalized device coords (-1..1) */
  pointer: THREE.Vector2
  /** Target pointer before easing */
  target: THREE.Vector2
  /** 0 when idle / left the stage, 1 while interacting */
  lift: number
  /** Whether the pointer is currently over the stage */
  hovering: boolean
}

export type MouseInteractionOptions = {
  /** Exponential easing rate — higher = snappier follow */
  damping?: number
}

const DEFAULTS = {
  damping: 5.5,
} as const

/**
 * Tracks pointer position with smooth easing for ribbon peak targeting.
 */
export class MouseInteractionController {
  readonly state: MouseInteractionState = {
    pointer: new THREE.Vector2(0, 0),
    target: new THREE.Vector2(0, 0),
    lift: 0,
    hovering: false,
  }

  private options: Required<MouseInteractionOptions>
  private attachedElement: HTMLElement | null = null
  private liftTarget = 0

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.attachedElement) return
    const rect = this.attachedElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    this.state.target.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1),
    )
    this.state.hovering = true
    this.liftTarget = 1
  }

  private readonly onPointerLeave = () => {
    this.state.hovering = false
    this.liftTarget = 0
  }

  constructor(options: MouseInteractionOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  attach(element: HTMLElement): void {
    this.detach()
    this.attachedElement = element
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerleave', this.onPointerLeave)
  }

  detach(): void {
    if (!this.attachedElement) return
    this.attachedElement.removeEventListener('pointermove', this.onPointerMove)
    this.attachedElement.removeEventListener('pointerleave', this.onPointerLeave)
    this.attachedElement = null
  }

  /**
   * Advance the eased pointer and lift amount.
   * Call once per frame with delta time in seconds.
   */
  update(delta: number): MouseInteractionState {
    const { damping } = this.options
    const alpha = 1 - Math.exp(-damping * delta)

    this.state.pointer.lerp(this.state.target, alpha)
    this.state.lift = THREE.MathUtils.lerp(this.state.lift, this.liftTarget, alpha)

    return this.state
  }

  dispose(): void {
    this.detach()
  }
}
