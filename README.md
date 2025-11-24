# Omni Monorepo

Unified workspace for Omni apps and shared packages.

## Structure
- `apps/backend` – Express + TypeScript API server (health check at `/health`).
- `apps/web` – Next.js + TypeScript web dashboard.
- `apps/mobile` – Expo + React Native mobile app.
- `packages/ui` – Shared UI components for web/mobile.
- `packages/types` – Shared TypeScript types.
- `packages/config` – Shared ESLint, Prettier, and TS config.

## Getting Started
1. Install pnpm (v8+).
2. Install dependencies: `pnpm install`.
3. Run an app:
   - Backend: `pnpm --filter backend dev`
   - Web: `pnpm --filter web dev`
   - Mobile: `pnpm --filter mobile start`

## Notes
- TypeScript configs extend shared settings from `packages/config`.
- Linting/formatting configs are centralized in `packages/config`.
- TODO: Add CI, testing setup, and real integrations (auth, DB, AI, screen time).
