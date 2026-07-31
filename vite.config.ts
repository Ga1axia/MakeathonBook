import { cpSync, mkdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Keep public/books in sync with the editable books/ source folder. */
function copyBooksPlugin(): Plugin {
  const sync = () => {
    mkdirSync('public/books', { recursive: true })
    cpSync('books', 'public/books', { recursive: true })
  }

  return {
    name: 'copy-books',
    buildStart() {
      sync()
    },
    configureServer() {
      sync()
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyBooksPlugin()],
})
