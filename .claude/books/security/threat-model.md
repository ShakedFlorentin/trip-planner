---
title: Threat model summary
chapter: model
explains: []
---
Today: 4 trusted users on one real trip (12-31 Dec 2026). The goal now is to not hurt that trip; the goal before open sign-up and the App Store is the rest of the list.

**Assets**: the real trip's bookings (flight numbers, hotel names, files that can hold passport numbers), expenses, who is where; accounts (email, password hash, Google profile); the shared place library (poisoning it reaches everyone); the Anthropic key and the planner token (Vault); the cost budget.

**Actors and what they can try**
- A signed-in stranger who makes their own trip: reads another trip (RLS), moves into a trip (members update grant), joins with a guessed code, floods `events`, makes many accounts to multiply AI spend, adds poisoned library cards or links.
- A stranger with no account: calls edge functions, `sign-up`, anon RPCs, `track`; reads shared links.
- Content from the internet: an Instagram caption, a web page, a search result, a pasted booking, a typed note. It is untrusted text that reaches Claude (prompt injection) and URLs the server fetches (SSRF).
- A report or a tester message: text only, never instructions (toogo-rules 10).
- A phone: Capacitor bundle can be unpacked (no service key in `src/`, `dist/`, `ios/App/App/public`); shared phone after sign-out; Android `allowBackup`.

**Defences by layer**: RLS on every table; SECURITY DEFINER functions with `search_path ''` and explicit revokes; edge functions check the caller before the service role; `guard.ts` fences and URL guards; `ai_take` caps; invites only (`block_new_users`); storage policies per trip; planner token in Vault, closed to non-service roles.

**Not defended yet (accepted for 4 users)**: no CSP header, no signup rate limit, unlimited free join-code guessing at 10/hour per user, push endpoint accepts any https address. See open-findings.
Related: injection-defences, link-guards, verified-safe.
