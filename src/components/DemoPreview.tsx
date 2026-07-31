type DemoPreviewProps = {
  onOpenLibrary: () => void
}

/**
 * Static spatial reading preview for the landing page.
 */
export function DemoPreview({ onOpenLibrary }: DemoPreviewProps) {
  return (
    <section className="demo-preview" aria-labelledby="demo-heading">
      <div className="section-inner">
        <div className="section-heading">
          <h2 id="demo-heading">A page you can drive through</h2>
          <p>
            A quiet path carries you left to right under each line, then through
            a portal to the next — while the text stays legible and focused.
          </p>
        </div>

        <div className="demo-preview__frame">
          <div className="demo-preview__chrome">
            <span>Drive to read</span>
          </div>
          <div className="demo-preview__stage">
            <div className="demo-preview__surface">
              <p className="demo-preview__lift">Move through text, not just pages.</p>
              <p>Books become navigable environments.</p>
              <p>Reading happens on a rendered 3D surface.</p>
              <p>The interface stays legible and focused.</p>
            </div>
          </div>
        </div>

        <div className="demo-preview__cta">
          <button type="button" className="btn btn--primary" onClick={onOpenLibrary}>
            Open the library
          </button>
        </div>
      </div>
    </section>
  )
}
