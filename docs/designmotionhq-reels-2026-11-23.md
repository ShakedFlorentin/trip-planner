# @designmotionhq - 1 reel, 2026-11-23

Who: design/motion account ("designmotionhq"), posts short design-rule reels; the caption sells its own tool ("UX Engine, link in bio"). Profile not opened (owner sent one link). Read: caption + frames (mp4 fetched from the signed-out reel page, 4x4 contact sheet read with Read; the whole 60-second reel at 1 frame per 4 s). Voice-over not heard; on-screen captions carry the content. Numbers below are the creator's claims.

| Shortcode | Topic | Lesson | Read |
|---|---|---|---|
| Df-drL4jt7Z (posted 2026-11-20) | Golden ratio (1.618) for UI | 1) Spacing scale: multiply by 1.618 (8, 13, 21, 34, 55). 2) Layout split about 61.8 / 38.2 (content / actions), claimed as Apple product page style. 3) Type scale, each step x1.618: 16 body, 26 subheading, 42 heading, 68 display. Claims Stripe, Linear, Airbnb "all use" it (unchecked). | frames + caption |

## Filter
- Kept (as an option, creator's claim): a stepped spacing/type scale with one fixed ratio.
- Skipped: "UX Engine, link in bio" (their own product pitch); "Your brain is literally wired to find it beautiful" and the seashell/galaxy/Mona Lisa line (folklore, no evidence); "Stripe, Linear, Airbnb use it" (unverified).
- Not a rule: Toogo already has tokens (`--s-*`, `--fs-*` in the app CSS, Apple-style sizes). A 1.618 type scale (26/42/68px) is far too large for a phone app; a 61.8/38.2 split fits tablets and web, not a swipe-first phone screen. Changing tokens needs code: idea for the owner only.

## What Toogo should take
- Idea only: if a new screen needs sizes or gaps outside the existing tokens, pick them from one fixed scale (Fibonacci-like 8, 13, 21, 34 for gaps) instead of ad-hoc numbers. Existing tokens stay.
- Nothing for toogo-ux-audit: its Spacing row already says "uses the spacing tokens".

Processed: Df-drL4jt7Z
