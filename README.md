# AI Finance App Prototype

Pulse is a mobile-first Vite + React + TypeScript prototype for AI-native personal finance guidance.

## Features

- Home screen with:
  - monthly spend tracking
  - projected month-end overspend
  - budget breakdown
  - recent transactions
  - plan entry points
- Advice experience with:
  - prompt-led advisor surface
  - dedicated chat flow
  - voice input pattern
- Presentation mode with product narrative slides and prototype walkthrough

## Tech Stack

- React
- TypeScript
- Vite
- Recharts
- Lucide React
- Motion

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

App runs on:

- `http://localhost:5173` (default Vite port)

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```text
src/
  App.tsx
  styles.css
  main.tsx
  components/
    sparkles/
```

## Git Branches

- `homepage-variation`: working branch used for iterative UI changes
- `main`: merged branch for deployment

## Deployment

This project is configured for Vercel.

Manual deploy:

```bash
npx vercel --prod
```

## Notes

- If Vercel detects `pnpm-lock.yaml`, it may use pnpm in CI.
- Current setup uses npm lockfile for deployment consistency.
