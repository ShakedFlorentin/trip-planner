# Load test with scripted users

`loadbot.mjs` runs many real accounts against the live Supabase project the way the app does (features.live
protocol): sign in, open the trip (deck by revision, `sync_library`, `card_interest`, …), hold the trip's live
channel, then swipe every 3–6 s, add a list item or an expense now and then, and reopen every few minutes. No AI calls.
Results of 14 Nov 2026: `docs/stress-test-2026-11-14.md` (end).

## Accounts
- 369 test accounts are kept in the project: `toogo.load.p2.gNNN.mN@example.com` (273 with a trip, listed in
  `accounts-p2.txt`) and older `toogo.stress*` ones. Their trips are in `public.test_trips`, so they never count in the
  cross-trip ranking (`refresh_library_interest`); a trip made by a test account is marked by the trigger
  `trips_mark_test`.
- Between tests their password is random and unknown. **The repository is public: never write a test password in it.**
  Before a test, set one (12+ characters) in the SQL editor, and pass the same to the script:

  ```sql
  update auth.users set encrypted_password = extensions.crypt('<password>', extensions.gen_salt('bf'))
   where email like 'toogo.load.%@example.com';
  ```
  After the test, make it unknown again:
  ```sql
  update auth.users set encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf'))
   where email like 'toogo.stress%@example.com' or email like 'toogo.load.%@example.com';
  ```

## Running
In a cloud session, Node reaches Supabase through the session's proxy:

```bash
LOAD_PASSWORD='<password>' RUN=p5 REUSE=scripts/load/accounts-p2.txt REUSE_RUN=p2 \
  NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
  node scripts/load/loadbot.mjs - 0 3
```

- Sign-ins are paced at 24 a minute (Supabase allows 1,800 an hour per IP address), so 273 accounts take ~11 minutes.
- Then waves of `WAVE` active users (40) every `WAVE_MS` (90 s), and `hold` minutes at the end.
- The brake stops everyone when the slowest 5% of small requests over the last minute take more than `P95_LIMIT` ms
  (5000) or more than `FAIL_LIMIT` (5%) fail. The project is shared with real users: keep the brake on.
- Logs go to `LOAD_OUT` (default `/tmp/toogo-load`): `metrics-<RUN>.jsonl` every 15 s, `summary-<RUN>.json` at the end.
- On the Free plan: realtime takes 200 connections at most, and a test uses part of the month's 5 GB download quota.
