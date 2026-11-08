# App to-do list (2026-11-03)

## Tonight: cities
- [ ] Add all eight cities beyond Tokyo, Yokohama, Kyoto, Osaka and Nara, with about 15 cards each. The list, the steps and the
      card text rules are in `docs/TODO-cities-night.md` (Hakone, Kamakura, Nikko, Kobe with Himeji, Hiroshima with Miyajima,
      Kanazawa, Takayama with Shirakawa-go, Fukuoka).

## Before the first 10 testers
- [ ] Send each tester the agreement in `docs/testers-agreement-he.md` and get a yes in writing (a chat message is enough). Read the
      draft once and change anything you do not stand behind; it is not legal advice.
- [ ] Supabase dashboard, Authentication: check that leaked-password protection is on, and decide whether email
      confirmation matters (testers are made through invites, which confirm the email themselves, see `sign-up`).
- [ ] Make one invite per tester (they can only sign up with an invite) and tell each to create their own trip.
- [ ] Decide how many link lookups a tester gets: the daily limit is 30 per person and the cost is yours; credits are off
      (`app_flags` key `credits`).
- [ ] Run the hand-applied SQL that `docs/HANDOFF.md` lists as not yet applied (reviews and plan sharing,
      `supabase/sql/2026-11-02-reviews-sharing.sql`; `supabase/sql/2026-11-02-solo-couple-both-like.sql`) after checking each is
      still needed.
- [ ] Try the whole path once with a fresh account: invite, sign up, create a trip, add a place by link, swipe, add a booking
      by hand, add one from a file. Check the new card wording and the pork and seafood section on the real phone.

## Photos and legal (decide before testers outside your group)
- [ ] The 192 card photos in 84 cards were fetched by `card-photos` from Tabelog, Instagram covers, place websites and
      Wikimedia Commons, and stored in our own bucket. The app records neither where each came from nor its licence, and shows
      no credit. Decide: keep only photos with a free licence plus a stored credit line (author, licence, link), or show the icon
      tile instead of a photo for the rest.
- [ ] Replacement photos: 44 places passed the looks check, see `docs/free-photo-candidates.md`. Only good-looking photos go on cards; the rest stay on the icon tile.
- [ ] Add a credit/licence field for photos and show it on the card; make `card-photos` keep only Commons images (with their
      licence data) and our own pictures.
- [ ] Short privacy notice and terms page in the app (who sees what, Supabase, Claude), a takedown contact for photos and text,
      and a disclaimer that facts on kosher, baby and opening hours can be wrong.
- [ ] Check where the Supabase project's data sits (region) and what the Israeli privacy law and, for any EU testers, GDPR
      ask of you once people outside your group use it; payments and VAT only matter when credits are sold.

## Later
- [ ] Booking.com (through CJ) and Klook affiliate links: on hold until there are real clients. If it comes back, add a
      commission disclosure to the testers' agreement.
- [ ] 46 cards had a pork and seafood note without a badge: badges were added by hand-judgement on 2026-11-03; correct any
      that look wrong.
- [ ] English card text was not regenerated after the Hebrew clean-up; fine for now, redo it if the app goes to English users.

## Done 2026-11-03
- Card sheet order, solid vote bar, sheet title wrapping, onboarding footer (deployed).
- Hebrew and kosher text of all 309 library cards cleaned; no "no certificate" lines; filler notes removed.
- `suggest-place` v31 deployed with the same rules.
- Database check as a stranger and as signed-out: no rows visible; shared-card tip no longer copied to the shared library.
