---
title: Build book, table of contents
chapter: start
explains: []
---
Read this first. Toogo is one React + Vite web build (`dist`) used three ways: the website on GitHub Pages, the iPhone app (Capacitor 8, the same `dist` inside the app) and an Android sideload test build. Agents write files and steps; the owner builds, signs, publishes and commits (toogo-rules 6, 9).

| Page | What it answers |
|---|---|
| web-build-and-pages | `npm run build`, deploy.yml, sw.js versioning, build-pages |
| ios | Xcode project, targets, App Group, signing, free vs paid team |
| android | gradle, JDK, APK, back button, manifest |
| release-checklist | Ship check plus what to do before a release |
| branches | main, local-signup-android and the other branches |

Commands in `docs/HANDOFF.md`. Skills: `toogo-ship-check` (what must pass), `toogo-app-review` and `toogo-store-listing` for store steps, `toogo-frontend-craft` (link, not copied).
Related: backend book (deploys).
