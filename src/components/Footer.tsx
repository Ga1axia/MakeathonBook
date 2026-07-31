type FooterProps = {
  onNavigateLibrary: () => void
}

/**
 * Quiet site footer with essential links.
 */
export function Footer({ onNavigateLibrary }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__brand">Ribbon</p>
        <div className="site-footer__links">
          <button type="button" onClick={onNavigateLibrary}>
            Library
          </button>
          <a href="https://www.gutenberg.org" target="_blank" rel="noreferrer">
            Public domain texts
          </a>
        </div>
        <p className="site-footer__copy">© {new Date().getFullYear()} Ribbon</p>
      </div>
    </footer>
  )
}
