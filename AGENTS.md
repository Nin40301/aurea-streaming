# AGENTS.md — AUREA

## Product and stack
AUREA is a Windows desktop media library and player built with Electron, React, TypeScript, Vite, SQLite, and Electron Forge. The UI is Portuguese-first. Keep the app usable with the included legally distributable Blender Foundation demo media and without a network connection.

## Architecture boundaries
- `src/main/`: Electron main process, SQLite persistence, add-on/network services, and demo server.
- `src/preload/`: narrow typed bridge. Do not expose Node APIs to the renderer.
- `src/renderer/`: React presentation, navigation, management screens, and player UI.
- `src/shared/`: shared models and validation types.
- Keep service and persistence behavior out of presentation components. Treat add-on responses as untrusted data.

## Security requirements
- Preserve `contextIsolation: true`, `nodeIntegration: false`, and sandboxing where configured.
- Never execute remote add-on scripts in the renderer.
- Do not add DRM circumvention, unauthorized content sources, credentials, tokens, signing keys, or user-local databases to Git.
- Validate external URLs and responses; keep timeouts and request limits.

## Development
Use the committed package lock and npm. Main commands: `npm ci`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run make` (Windows x64). Run relevant checks after code changes. E2E tests launch Electron and use disposable data directories.

## UI direction
AUREA 2.0 uses the selected Editorial direction documented in `REDESIGN_2.0.md` and `DESIGN_SYSTEM.md`. Maintain consistent premium editorial styling, keyboard access, visible focus, and `prefers-reduced-motion`. Never inflate short catalogs by duplicating titles. Preserve empty/error/loading states and functional navigation.

## Collaboration
Read `PROJECT_STATUS.md` before substantial work and update it when scope, test results, release status, or known limitations change. Preserve existing user data and assets. Do not rewrite history or force-push shared branches. Use feature branches and pull requests for collaboration.
