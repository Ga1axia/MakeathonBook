/** Shared book page proportions — portrait left page, trade-paperback. */
export const BOOK = {
  /** Page width in world units */
  pageWidth: 3.55,
  /** Page height in world units (taller standard book) */
  pageHeight: 5.5,
  /** Physical-ish thickness of the page stack */
  thickness: 0.14,
  /** Per-line ribbon height (world) — slightly above typical 11pt body */
  ribbonHeight: 0.118,
  /** Vertical gap between line ribbons — wide enough for the drive-mode car */
  lineGap: 0.22,
  /** Horizontal lift peak radius */
  ellipseX: 1,
  /** Vertical hover ellipse — tight to one line */
  ellipseY: 0.09,
  /** Lift height */
  maxLift: 0.62,
  neighborLift: 0.28,
  /** Canvas strip resolution (aspect matches ribbonHeight / pageWidth) */
  textureWidth: 1600,
  /** 1600 * (0.118 / 3.55) ≈ 53 */
  textureHeight: 56,
  /** Glyph size on the strip canvas — a bit larger than standard book body */
  fontSize: 44,
  fontFamily: '"IBM Plex Serif", "Source Serif 4", Georgia, serif',
  pageColor: '#f7f5f0',
  edgeColor: '#ebe7df',
  sceneBackground: '#fafafa',
} as const

/** User-adjustable book orientation in degrees. Page faces the camera when all are 0. */
export type BookAngles = {
  /** Pitch — positive tips the top of the page away (view from above) */
  tilt: number
  /** Yaw — positive turns the page to the right */
  turn: number
  /** Roll — positive rotates clockwise on screen */
  roll: number
}

export const DEFAULT_BOOK_ANGLES: BookAngles = {
  tilt: 14,
  turn: 0,
  roll: 0,
}

export const BOOK_ANGLE_LIMITS = {
  tilt: { min: -15, max: 55 },
  turn: { min: -60, max: 60 },
  roll: { min: -35, max: 35 },
} as const

export const BOOK_POSITION: [number, number, number] = [0, 0.15, 0]

/** Elevated readable view — look target is driven by the hovered / driven line. */
export const CAMERA_RIG = {
  fov: 28,
  /** Distance from the look target */
  distance: 7.2,
  /** Bias toward spine / outer edge */
  acrossPage: 0,
  /** How quickly the camera eases to the hovered line */
  scrollDamping: 4.2,
  /** Default focus near the top of the page before the user hovers */
  lookTopY: BOOK.pageHeight * 0.34,
  /** Soft clamp for hover mode; drive mode follows the car without this limit */
  lookBottomY: -BOOK.pageHeight * 0.4,
  /**
   * Drive-mode framing: fraction of the viewport height from the top
   * where the car should sit (0.75 = three-quarters down the screen).
   */
  driveCarScreenY: 0.75,
}

/** 0° = face-on to the page, higher = more from above */
export const DEFAULT_CAMERA_ANGLE = 28

export const CAMERA_ANGLE_LIMITS = {
  min: 0,
  max: 75,
} as const

export type PageScrollState = {
  /** Eased page-local Y the camera is looking at */
  lookY: number
  /** Target page-local Y from the active text line */
  targetY: number
}

export function anglesToRadians(angles: BookAngles): [number, number, number] {
  const deg = Math.PI / 180
  return [angles.tilt * deg, angles.turn * deg, angles.roll * deg]
}
