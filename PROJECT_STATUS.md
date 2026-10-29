# AUREA — project status

Updated: 2026-10-28

## Current version
Source package version: 2.0.0. Electron desktop app for Windows x64.

## Architecture
Electron main process with SQLite and add-on services; constrained preload bridge; React/TypeScript renderer; MP4/HLS player; Stremio-compatible HTTP add-on adapter (partial protocol compatibility). See `ARCHITECTURE.md` and `README.md`.

## Current UI
AUREA 2.0 Editorial visual direction is implemented across the primary application shell, discovery, catalog, details/episodes, profile, library, add-on management, preferences, and player styling. Screenshots and review notes are in `screenshots/` and `VALIDATION_2.0.md`.

## Verification recorded
- TypeScript typecheck and ESLint passed.
- Vitest: 14 tests passed.
- Playwright Electron: 5 end-to-end flows passed in development and against the packaged executable. Coverage includes navigation/search/profiles/library, add-on persistence, real MP4/HLS, subtitles, progress resume, keyboard controls, and failed sources.
- Windows x64 Squirrel setup and portable ZIP generated from `npm run make`.

## Outstanding / known limitations
- GH CLI authentication is not established yet; verify `gh auth status` and ensure account is `Nin40301` before preparing the private remote.
- Publishing is pending user approval of the exact staged file list. Do not push without that approval.
- 2.0 screenshot coverage is not exhaustive at both target resolutions; see `VALIDATION_2.0.md`.
- Setup installer was generated but not installed on this machine. Authenticode signing is absent.
- Add-on protocol support is partial; no DASH, DRM, torrents, IPFS, or remote script execution. Demo catalog is deliberately small.
- Official demo media is licensed and credited in `assets/THIRD_PARTY_NOTICES.md`.
