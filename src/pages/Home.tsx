import { DemoPreview } from '../components/DemoPreview'
import { FeatureCards } from '../components/FeatureCards'
import { Hero } from '../components/Hero'

type HomeProps = {
  onTry: () => void
  onBrowse: () => void
}

/**
 * Marketing landing — concept, features, preview, CTA.
 */
export function Home({ onTry, onBrowse }: HomeProps) {
  return (
    <div className="page page--home">
      <Hero onTry={onTry} onBrowse={onBrowse} />

      <section className="concept" aria-labelledby="concept-heading">
        <div className="section-inner concept__inner">
          <h2 id="concept-heading">A spatial reading interface</h2>
          <div className="concept__grid">
            <p>
              Books become navigable environments. Instead of flipping flat
              pages, you move through text rendered on a deformable 3D surface.
            </p>
            <p>
              Drive-to-read gives reading a physical path — line by line, left
              to right — while the interface stays calm, legible, and focused.
            </p>
          </div>
        </div>
      </section>

      <FeatureCards />
      <DemoPreview onOpenLibrary={onBrowse} />

      <section className="closing-cta" aria-labelledby="closing-heading">
        <div className="section-inner closing-cta__inner">
          <h2 id="closing-heading">Start with a book</h2>
          <p>Upload your own text or open one from the library.</p>
          <div className="closing-cta__actions">
            <button type="button" className="btn btn--primary" onClick={onTry}>
              Try it now
            </button>
            <button type="button" className="btn btn--secondary" onClick={onBrowse}>
              Browse library
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
