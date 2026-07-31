import spatialLogo from '../assets/spatial-logo.png'

type HeroProps = {
  onTry: () => void
  onBrowse: () => void
}

/**
 * Landing hero — Spatial brand lockup, short pitch, CTAs.
 */
export function Hero({ onTry, onBrowse }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="visually-hidden">
        Spatial — Read beyond the page
      </h1>

      <div className="hero__mark">
        <img
          className="hero__logo"
          src={spatialLogo}
          alt=""
          width={584}
          height={508}
          decoding="async"
        />
      </div>

      <p className="hero__sub">
        Upload a book or choose one from the library, then read through a
        spatial interface where text is rendered as a navigable surface.
      </p>

      <p className="hero__drive-cue">Drive W to scroll the page</p>

      <div className="hero__actions">
        <button type="button" className="btn btn--primary" onClick={onTry}>
          Try it now
        </button>
        <button type="button" className="btn btn--secondary" onClick={onBrowse}>
          Browse library
        </button>
      </div>
    </section>
  )
}
