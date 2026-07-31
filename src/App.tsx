import { useState } from 'react'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Reader } from './pages/Reader'
import {
  createDemoBook,
  createReaderSession,
  type AppPage,
  type LibraryBook,
  type ReaderSession,
} from './state/readerState'
import type { BookAngles } from './ribbon/bookLayout'
import './App.css'

function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [uploadedBooks, setUploadedBooks] = useState<LibraryBook[]>([])
  const [session, setSession] = useState<ReaderSession | null>(null)

  const openBook = (book: LibraryBook) => {
    setSession(createReaderSession(book))
    setPage('reader')
  }

  const handleUpload = (book: LibraryBook) => {
    setUploadedBooks((prev) => [book, ...prev])
  }

  const navigate = (next: AppPage) => {
    if (next === 'reader' && !session) {
      setPage('library')
      return
    }
    setPage(next)
  }

  const updateAngles = (angles: BookAngles) => {
    setSession((prev) => (prev ? { ...prev, angles } : prev))
  }

  const updateCameraAngle = (cameraAngle: number) => {
    setSession((prev) => (prev ? { ...prev, cameraAngle } : prev))
  }

  const updateText = (text: string) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            book: { ...prev.book, text },
          }
        : prev,
    )
  }

  const updateCruise = (cruiseMph: number) => {
    setSession((prev) => (prev ? { ...prev, cruiseMph } : prev))
  }

  const showChrome = page !== 'reader'

  return (
    <div className={`app-shell${page === 'reader' ? ' app-shell--reader' : ''}`}>
      {showChrome ? (
        <Nav
          page={page}
          onNavigate={navigate}
          currentBookTitle={session?.book.title ?? null}
        />
      ) : null}

      <main className="app-shell__main">
        {page === 'home' ? (
          <Home
            onTry={() => openBook(createDemoBook())}
            onBrowse={() => setPage('library')}
          />
        ) : null}

        {page === 'library' ? (
          <Library
            uploadedBooks={uploadedBooks}
            onUpload={handleUpload}
            onOpenBook={openBook}
            continueTitle={session?.book.title ?? null}
          />
        ) : null}

        {page === 'reader' && session ? (
          <Reader
            session={session}
            onBack={() => setPage('library')}
            onAnglesChange={updateAngles}
            onCameraAngleChange={updateCameraAngle}
            onTextChange={updateText}
            onCruiseChange={updateCruise}
          />
        ) : null}
      </main>

      {showChrome ? (
        <Footer onNavigateLibrary={() => setPage('library')} />
      ) : null}
    </div>
  )
}

export default App
