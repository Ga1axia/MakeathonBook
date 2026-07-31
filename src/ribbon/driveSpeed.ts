/** Display range for the instrument dial */
export const SPEED_DIAL_MAX_MPH = 120

/** User-settable cruise speed limits (menu slider) */
export const CRUISE_SPEED_LIMITS = {
  min: 10,
  max: 80,
  default: 60,
  step: 1,
} as const

/** How hard boost pushes past cruise */
export const BOOST_MULTIPLIER = 1.85

/**
 * Map displayed MPH → page-world units per second.
 * 30 mph ≈ the original 2.1 u/s cruise feel.
 */
export function mphToWorldSpeed(mph: number): number {
  return (Math.max(0, mph) * 2.1) / 30
}

export function clampCruiseMph(mph: number): number {
  return Math.min(
    CRUISE_SPEED_LIMITS.max,
    Math.max(CRUISE_SPEED_LIMITS.min, Math.round(mph)),
  )
}

export function boostTargetMph(cruiseMph: number): number {
  return Math.min(SPEED_DIAL_MAX_MPH, cruiseMph * BOOST_MULTIPLIER)
}
