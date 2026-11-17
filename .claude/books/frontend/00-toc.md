---
title: Frontend book, table of contents
chapter: index
explains:
  - App
  - TripApp
---
Read this first. Toogo frontend = React 19 + Vite + TypeScript in `src/`, Hebrew (RTL) first with English, wrapped for iPhone by Capacitor 8. House rules: `.claude/skills/toogo-rules/SKILL.md` (wins over everything). Checks before "done": `toogo-ship-check`. UI behaviours: `ui-sdk`. Craft rules (empty today): `toogo-frontend-craft`.

## Shell and data
- [01-app-shell](01-app-shell.md): App.tsx gates (session, profile, guest, trip), TripApp, tabs, header, wand.
- [02-data-layer](02-data-layer.md): TableStore, useTripTable, live Broadcast channel, the localStorage cache.
- [03-offline-outbox](03-offline-outbox.md): outboxFetch, 8 s write timeout, 409 rules, retry, failed changes, "ready" pre-save.
- [04-service-worker-updates](04-service-worker-updates.md): public/sw.js, 4 s navigation timeout, update-on-return in main.tsx.
- [05-i18n](05-i18n.md): t(), en-*.ts files, i18n-check, LTR mirror.
- [06-native-bridge](06-native-bridge.md): native.ts, isNative, Capacitor plugins, widgets, quick actions, auth links.

## Screens
- [07-views-home-plan](07-views-home-plan.md): Home, Itinerary, Replan, Stays, planUtils.
- [08-views-discover](08-views-discover.md): SwipeGame, Card, MatchPop, ranking, AddPlace.
- [09-views-places-maps](09-views-places-maps.md): Places, PlacesMap, AreaMap, photos, ratings, who filter.
- [10-views-bookings-money](10-views-bookings-money.md): Bookings and the import check, Expenses, money.ts, settle-up.
- [11-views-lists-translator-search](11-views-lists-translator-search.md): Lists, Essentials, Baby, Translator, Search.
- [12-views-share-settings-report](12-views-share-settings-report.md): Share, SharedPlan, Settings, Menu, TripPicker, SignOutSheet, Report.

## Building blocks and checks
- [13-ui-sdk-and-styles](13-ui-sdk-and-styles.md): ui.tsx, toast.tsx, ui-sdk components in use, CSS files and tokens, ErrorBoundary.
- [14-testing-and-ship-check](14-testing-and-ship-check.md): npm scripts, scripts/*.mjs, the ship-check commands, UI check with mocked Supabase.
