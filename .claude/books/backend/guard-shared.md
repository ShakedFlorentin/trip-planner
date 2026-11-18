---
title: _shared/guard.ts and the shared files
chapter: functions
explains:
  - fence
  - escapeForBlock
  - isPrivateHost
  - redirectAllowed
  - imageHostAllowed
  - dnsAllowed
  - followRedirects
  - readCapped
  - fetchLimited
  - safeUrl
  - stripProse
  - makesClaim
  - isIndependent
  - sanitiseCard
---
`supabase/functions/_shared/guard.ts` (518 lines) is pure code with no imports (Deno DNS is reached through `globalThis` and injectable), so it runs in the functions and in `npm run test:guard` / `npm run test:suggest-guard`. Used by suggest-place, card-photos, card-facts, parse-booking.

Three defences:
1. **Fences.** `fence(tag, text, max)` wraps untrusted text in `<tag>` with angle brackets and control/bidi characters stripped (`escapeForBlock`), so it cannot close the block. `DATA_RULE` is the paragraph every such prompt carries.
2. **No blind fetches.** `isPrivateHost` (localhost, private/link-local/metadata IPs, odd IPv4 spellings, intranet names), `redirectAllowed`, `imageHostAllowed`, `publicHttpsAllowed`, `dnsAllowed` (resolves A and AAAA and refuses private answers; a failed lookup refuses), `followRedirects` (checks every hop, `MAX_HOPS` 5), `fetchLimited` / `readCapped` (size caps: `MAX_HTML` 2 MB, `MAX_IMAGE` 6 MB, image types jpeg/png/webp).
3. **What is kept of the answer.** `sanitiseCard`: URLs only from an `allowedSet` of what the function was given (`safeUrl`), prose without links or markup (`stripProse`), lengths clamped, and sensitive claims (kosher, free, safe, opening hours; `makesClaim`) only with an independent source (`isIndependent`).

Other shared files
- `credits.ts`: `creditsOn`, `hold`, `settle`, `refund` (see ai-cost-controls). `pass.ts`: `holdPlace`, `settlePlace`, `refundPlace`.
- `settings.ts`: `settingInt`, `featureOn` (60 s cache; fallback in code when the table is unreadable).
- `webpush.ts`: `sendPush`, `vapidToken`, `encrypt`, `newVapidKeys`. `areas.ts`: `AREAS`, `areaOf`, `HUBS` (city areas, also used by the Pages build).

Rule: any new function that fetches a URL or sends text to Claude must use these, and a new case gets a test in `scripts/guard-test.mjs`. Deploys must include `_shared/` files they import.
Related: security book (injection-defences, link-guards), functions-ai.
