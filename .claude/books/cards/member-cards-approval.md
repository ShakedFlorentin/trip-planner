---
title: Approval of member cards
chapter: model
explains: []
---
**The hole (audit finding 1)**: `card_to_library` (2026-11-09) built the shared library card from the first member's text, links and photos and switched it on once a second trip creator added the same name; `sync_library` then pushed it into every trip. Two accounts could put their own text and links in everyone's Discover.

**The fix: `supabase/sql/2026-11-16-library-poisoning.sql`, NOT APPLIED** (owner applies it after the trip, toogo-rules 6). What it does, all idempotent:
- `place_library.approved` (default true so existing and SQL-seeded cards keep working) and `promotion_ready_at`.
- `card_to_library` inserts a member-made card with `approved = false, active = false`; when the old rule "2 trips by 2 people" is met it only stamps `promotion_ready_at` (a queue for the admin). It never copies member links, sources or photos into the library. A card from a shared plan (`candidates.source = 'shared_import'`) neither creates a library card nor votes.
- A trigger (`place_library_guard`) makes "active but not approved" impossible, so every reader of `active` stays correct.
- `place_library_safe_links` also cleans `sources`; `candidates_safe_links` cleans links, photos, sources on future writes (existing candidates are not rewritten).
- `sync_library` copies library text, facts, links and photos only from approved cards, and a library card with no photos no longer wipes a trip's own photos.
- `photo_submissions.source` (`member` or `server`): card-photos queues photos it finds for a library card it did not create instead of overwriting.
- Admin approval: `approve_library_card(id)` (app admins only, check `is_app_admin()`) or, for the owner in the SQL editor, `update place_library set approved = true, active = true where id = ...`. It costs the admin one look and no new AI call.

**Until it is applied**: member-added cards can still reach the library. Do not add new "promote to library" paths. The client already writes `source: 'shared_import'` (`src/views/SharedPlan.tsx`) and needs the column.
**Precheck and verify queries** are in the file header (counts of active member-made cards, `active and not approved` should be 0).
Related: library-model, security book (injection-defences), backend book (sql-files-status).
