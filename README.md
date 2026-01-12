# Menu Mixer

Recipe management and menu planning for bakers, cafes, and caterers.

**Live**: [menu-mixer.github.io](https://menu-mixer.github.io)

## What It Does

- **Universal Import** - Drag in PDFs, photos, URLs, or text. AI extracts structured recipes.
- **Visual Menu Planning** - Drag recipes between backlog and active menu. Organize by season, client, or event.
- **AI Optimization** - Maximize ingredient reuse, ensure dietary coverage, re-theme for seasons.
- **Private & Local** - All data stored in your browser. No account needed. Export anytime.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand + IndexedDB |
| AI Proxy | Cloudflare Worker |
| AI | OpenAI GPT-4 (multimodal for PDF/image parsing) |

## Project Structure

```
menu-mixer.github.io/
├── app/                 # React application (deployed to /mixer)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/         # Utilities (AI, parsing, storage)
│   │   ├── stores/      # Zustand state management
│   │   └── types/       # TypeScript types
│   └── dist/            # Build output
├── landing/             # Landing page (deployed to /)
├── worker/              # Cloudflare Worker (AI proxy + auth)
├── docs/                # PRD and implementation plans
└── dist/                # Combined deployment (landing + app)
```

## Development

```bash
# App development
cd app
npm install
npm run dev           # http://localhost:5173

# Worker development
cd worker
npm install
npm run dev           # Local worker proxy
```

## Deployment

Push to `main` triggers GitHub Actions:
1. Builds React app to `dist/mixer/`
2. Copies landing page to `dist/`
3. Deploys to GitHub Pages

Worker deployed separately via `wrangler deploy`.

## Features Implemented

- [x] Drag-and-drop recipe import (PDF, images, text, URLs)
- [x] AI-powered recipe extraction with dietary tagging
- [x] Recipe cards with structured data
- [x] Menu editor with active/backlog sections
- [x] Multiple menus support
- [x] Recipe/menu item editing
- [x] Invite code authentication
- [x] First-time user onboarding tour
- [x] Starter pack with sample recipes
- [x] Export/import data as ZIP
- [x] Settings with hard reset option

## Documentation

- [Product Requirements](docs/PRD.md) - Full PRD with personas, features, architecture
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Development roadmap
