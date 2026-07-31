import { useEffect, useRef, useState } from 'react'

type KeyFlags = {
  forward: boolean
  reverse: boolean
  boost: boolean
}

const CRUISE_PX = 520
const BOOST_PX = 980
const ACCEL = 1400
const BRAKE = 1600
const DOUBLE_TAP_MS = 280

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
    case 'ArrowUp':
    case 'KeyD':
    case 'ArrowRight':
      return 'forward'
    case 'KeyS':
    case 'ArrowDown':
    case 'KeyA':
    case 'ArrowLeft':
      return 'reverse'
    default:
      break
  }

  switch (key.toLowerCase()) {
    case 'w':
    case 'arrowup':
    case 'd':
    case 'arrowright':
      return 'forward'
    case 's':
    case 'arrowdown':
    case 'a':
    case 'arrowleft':
      return 'reverse'
    default:
      return null
  }
}

function isBoostTapKey(code: string, key: string): boolean {
  return code === 'KeyW' || key.toLowerCase() === 'w' || code === 'ArrowUp'
}

/**
 * Landing-page drive: steer the wireframe car down the page to scroll.
 * Wheel / trackpad still work and keep the car in sync.
 */
export function LandingDrive() {
  const laneRef = useRef<HTMLDivElement>(null)
  const carRef = useRef<HTMLDivElement>(null)
  const dashRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)
  const keysRef = useRef<KeyFlags>({
    forward: false,
    reverse: false,
    boost: false,
  })
  const speedRef = useRef(0)
  const facingRef = useRef(1)
  const lastWTapRef = useRef(0)
  const hintHiddenRef = useRef(false)
  const ignoreScrollSync = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const placeCarFromScroll = () => {
      const car = carRef.current
      const lane = laneRef.current
      if (!car || !lane) return

      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      const laneHeight = lane.offsetHeight
      const carHeight = car.offsetHeight
      const travel = Math.max(0, laneHeight - carHeight - 32)
      const top = 16 + progress * travel
      const angle = facingRef.current >= 0 ? 90 : -90
      car.style.transform = `translate3d(-50%, ${top}px, 0) rotate(${angle}deg)`

      if (dashRef.current) {
        dashRef.current.style.backgroundPositionY = `${-window.scrollY * 0.45}px`
      }
    }

    const onScroll = () => {
      if (ignoreScrollSync.current) return
      placeCarFromScroll()
    }

    placeCarFromScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', placeCarFromScroll)

    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const keys = keysRef.current
      let input = 0
      if (keys.forward) input += 1
      if (keys.reverse) input -= 1

      const boosting = keys.boost && keys.forward
      const target =
        input === 0 ? 0 : input * (boosting ? BOOST_PX : CRUISE_PX)
      const rate =
        input === 0 || Math.sign(target) !== Math.sign(speedRef.current)
          ? BRAKE
          : ACCEL
      const diff = target - speedRef.current
      const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
      speedRef.current += step
      if (Math.abs(speedRef.current) < 4 && input === 0) speedRef.current = 0

      if (speedRef.current !== 0) {
        facingRef.current = speedRef.current >= 0 ? 1 : -1

        if (!hintHiddenRef.current) {
          hintHiddenRef.current = true
          if (hintRef.current) hintRef.current.hidden = true
        }

        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        )
        const next = Math.min(
          maxScroll,
          Math.max(0, window.scrollY + speedRef.current * dt),
        )
        ignoreScrollSync.current = true
        window.scrollTo(0, next)
        placeCarFromScroll()
        ignoreScrollSync.current = false
      }

      if (carRef.current) {
        carRef.current.dataset.boosting = boosting ? 'true' : 'false'
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', placeCarFromScroll)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTextEntryTarget(event.target)) return

      const move = keyToMove(event.code, event.key)
      if (!move) return
      event.preventDefault()

      if (move === 'forward') {
        if (!event.repeat && isBoostTapKey(event.code, event.key)) {
          const now = performance.now()
          if (now - lastWTapRef.current <= DOUBLE_TAP_MS) {
            keysRef.current.boost = true
          }
          lastWTapRef.current = now
        }
        keysRef.current.forward = true
        return
      }

      keysRef.current.reverse = true
      keysRef.current.boost = false
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const move = keyToMove(event.code, event.key)
      if (!move) return
      event.preventDefault()

      if (move === 'forward') {
        keysRef.current.forward = false
        if (isBoostTapKey(event.code, event.key)) {
          keysRef.current.boost = false
        }
        return
      }

      keysRef.current.reverse = false
    }

    const clearKeys = () => {
      keysRef.current = { forward: false, reverse: false, boost: false }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', clearKeys)
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div className="landing-drive" aria-hidden="true">
      <div ref={laneRef} className="landing-drive__lane">
        <div ref={dashRef} className="landing-drive__dashes" />
        <div ref={carRef} className="landing-drive__car">
          <LandingCarSvg />
        </div>
      </div>

      <p ref={hintRef} className="landing-drive__hint">
        W drive · S reverse · double-tap W boost
      </p>
    </div>
  )
}

/** Top-down wireframe car — rotated 90° in CSS so +X becomes down-page. */
function LandingCarSvg() {
  return (
    <svg
      className="landing-drive__svg"
      viewBox="0 0 72 40"
      width="72"
      height="40"
      fill="none"
      stroke="#141414"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <rect x="10" y="10" width="44" height="20" />
      <rect x="18" y="13" width="20" height="14" />
      <path d="M38 13 V27" />
      <rect x="14" y="4" width="10" height="6" />
      <rect x="14" y="30" width="10" height="6" />
      <rect x="40" y="4" width="10" height="6" />
      <rect x="40" y="30" width="10" height="6" />
      <path d="M54 16 H62 V24 H54" />
    </svg>
  )
}
