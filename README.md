# Ribbon

A spatial reading interface — books rendered as navigable 3D surfaces, with a drive-to-read mode that moves line by line.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Structure

- `src/pages` — Home, Library, Reader
- `src/components` — nav, hero, library, reader chrome
- `src/ribbon` — 3D reading surface, drive mode, textures
- `src/books` — catalog loaders and text preparation
- `books/` — plain-text library sources (copied to `public/books` for static serving)
