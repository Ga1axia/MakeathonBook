const FEATURES = [
  {
    title: 'Upload a book instantly',
    body: 'Open a plain text file and begin reading without setup.',
  },
  {
    title: 'Choose from a library',
    body: 'Browse built-in texts and continue whenever you return.',
  },
  {
    title: 'Read in a spatial interface',
    body: 'Text becomes a navigable 3D surface you can move through.',
  },
] as const

/**
 * Iconless feature highlights — short, factual, equal weight.
 */
export function FeatureCards() {
  return (
    <section className="feature-cards" aria-labelledby="features-heading">
      <div className="section-inner">
        <div className="section-heading">
          <h2 id="features-heading">Built for focused reading</h2>
          <p>Three ways into the experience. Nothing extra.</p>
        </div>
        <ul className="feature-cards__list">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="feature-cards__item">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
