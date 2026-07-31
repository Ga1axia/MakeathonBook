type HeroProps = {
  onTry: () => void
  onBrowse: () => void
}

/**
 * Landing hero — brand, headline, CTAs, and spatial preview frame.
 */
export function Hero({ onTry, onBrowse }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero__copy">
        <p className="hero__brand">Ribbon</p>
        <h1 className="hero__headline">Read in 3D.</h1>
        <p className="hero__sub">
          Upload a book or choose one from the library, then read through a
          spatial interface where text is rendered as a navigable surface.
        </p>
        <div className="hero__actions">
          <button type="button" className="btn btn--primary" onClick={onTry}>
            Try it now
          </button>
          <button type="button" className="btn btn--secondary" onClick={onBrowse}>
            Browse library
          </button>
        </div>
      </div>

      <div className="hero__visual" aria-hidden="true">
        <div className="hero-preview">
          <div className="hero-preview__page">
            <div className="hero-preview__line hero-preview__line--active">
              Each line is its own ribbon of paper.
            </div>
            <div className="hero-preview__line">
              Words rise under your hand and fall away.
            </div>
            <div className="hero-preview__line">
              Neighboring lines stir only a little.
            </div>
            <div className="hero-preview__line">
              The rest of the page stays quiet.
            </div>
            <div className="hero-preview__line">
              Type stays glued to the surface.
            </div>
            <div className="hero-preview__car" />
          </div>
        </div>
      </div>
    </section>
  )
}
