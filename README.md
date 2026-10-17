# Mr. Fixer — AI-Powered Website Auditing Tool

> Practical developer tool that audits a webpage and explains what is wrong, why it matters, and how to fix it.

## Architecture & Tech Stack

- **Backend**: Node.js (v22) + Express + TypeScript
  - Decoupled `createApp()` architecture for fast, port-collision-free integration testing.
  - Fail-fast configuration parsing with **Zod**.
  - Centralized error handling and clean health telemetry.
- **Frontend**: React + TypeScript + Vite
  - Linear/Vercel-inspired dark developer aesthetic.
  - Vite dev server reverse proxy (`/api` -> backend) eliminating CORS friction in development.
  - Resilient status handling (graceful Offline / Error boundary).

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
To run both backend and frontend concurrently:
```bash
npm run dev
```

Or run them individually:
```bash
# Terminal 1 - Backend (port 3001)
npm run dev:backend

# Terminal 2 - Frontend (port 5173)
npm run dev:frontend
```

### 3. Run Backend Integration Tests
```bash
npm test
```

## Project Structure
```
mr_fixer/
├── Mr_Fixer_Mini_PRD.md
├── package.json              # Monorepo workspaces & orchestrator scripts
├── .gitignore                # Production, secrets, and cache rules
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example          # Environment variable template
│   ├── src/
│   │   ├── app.ts            # Decoupled Express app
│   │   ├── index.ts          # Server entry point
│   │   ├── config.ts         # Zod environment schema
│   │   ├── types.ts          # API response types
│   │   └── middleware/
│   │       └── errorHandler.ts # Centralized error handler
│   └── tests/
│       └── health.test.ts    # Supertest integration tests
└── frontend/
    ├── package.json
    ├── vite.config.ts        # Vite + backend proxy configuration
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── App.tsx           # Health telemetry & connection state
        ├── types.ts
        ├── main.tsx
        └── index.css
```
