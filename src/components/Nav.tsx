import type { AppPage } from '../state/readerState'

type NavProps = {
  page: AppPage
  onNavigate: (page: AppPage) => void
  currentBookTitle?: string | null
}

/**
 * Minimal site navigation — brand, home, library, optional current book.
 */
export function Nav({ page, onNavigate, currentBookTitle }: NavProps) {
  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <button
          type="button"
          className="site-nav__brand"
          onClick={() => onNavigate('home')}
        >
          Ribbon
        </button>

        <nav className="site-nav__links" aria-label="Primary">
          <button
            type="button"
            className={`site-nav__link${page === 'home' ? ' is-active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`site-nav__link${page === 'library' ? ' is-active' : ''}`}
            onClick={() => onNavigate('library')}
          >
            Library
          </button>
          {currentBookTitle ? (
            <button
              type="button"
              className={`site-nav__link${page === 'reader' ? ' is-active' : ''}`}
              onClick={() => onNavigate('reader')}
            >
              {currentBookTitle}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
