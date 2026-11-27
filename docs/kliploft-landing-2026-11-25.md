# KlipLoft landing page, read 2026-11-25

URL: https://www.kliploft.app/ (clean URL, no tracking parameters). Sent by the owner; it came from a Facebook ad.

## Who they are
KlipLoft is a clipboard-history app by one developer (footer: Ron Erez). Free direct download for Mac (DMG, signed and notarized), a $6.99 one-time iPhone/iPad app (KlipLoft Go), a $4.99 one-time Mac App Store app (KlipLoft Mini). Pitch: no subscription, no account, no tracking, iCloud sync, an MCP link to Claude and Cursor. A utility, not a travel or social app, but the landing job is the same: stranger, a few seconds, one button.

## How I read it
Built-in browser, signed out, no clicks, no forms, no downloads. Read with get_page_text, read_page and in-page JavaScript that only read the DOM and performance entries. Screenshots come back as raw image data I cannot see, so **I did not see the visuals**: layout, colour, typography and the animation are not judged. I could not resize the window to 390 wide (no resize tool); pane viewport reported 1024x768. Mobile layout: not read, only the viewport meta tag exists. Facebook ad: I do not have the ad, so ad-to-page match is **not assessed**; I only know what the first screen promises.

## Section by section (desktop DOM order)

| # | Section (id) | Content | Job |
|---|---|---|---|
| 1 | hero (quick-paste) | "Your clipboard forgets. KlipLoft doesn't." / "Free clipboard history for Mac. Also on iPhone and iPad." / signed-and-notarized link / Download for Mac (Free) / requirement in tooltip / DMG or App Store switch / More apps / Homebrew command / Compare link. Under it: "Free · 1,000+ downloads in the first week · Signed by Apple · No permissions needed", then a row of real-looking clip cards (colour, photo, calendar event, recipe link, code, SQL, mail) with shortcut keys | Say the pain, the price, one action; show the product holding real content |
| 2 | trust | "1,000+ downloads in the first week", "People switch, and don't look back", three short quotes signed "KlipLoft User", "Ex-Paste User" | Social proof (all the site's own claims, anonymous) |
| 3 | features | "Your Mac clipboard, with a memory." Six cards: instant paste, sizes per screen, screenshots, pinboards, search, iCloud sync; each with a small demo image and a one-line how | Show each benefit with its key press |
| 4 | mcp | "KlipLoft. Powered by MCP." one-liner plus looping video | Niche hook for AI-tool users |
| 5 | security | "We take your security seriously": passwords never saved, stays on your devices, private iCloud, no tracking or accounts; link to IT review and privacy policy | Objection handling (trust) |
| 6 | compare-mini | "Switching from Paste or Maccy?" 5-row table (price, full history free, sync, MCP, sizes) vs Paste ($3.99 a month, 7-day trial), tabs for Maccy, Klipto, Clipy; one-click import of their old history | Remove the switching cost |
| 7 | customize | Optional paid looks, "free on Mac, say thanks" | Soft revenue, no gate |
| 8 | bonus | Six extras (keyboard per app, window size, snap, middle click, funny cursor, "coming soon") | Delight, personality |
| 9 | mini, go | One paragraph each, price once, store buttons | Cross-sell the paid apps |
| 10 | chooser | "Which KlipLoft is right for you?" link to a compare page | Route the undecided |
| 11 | final CTA | "Never lose a copy again." price line, "No subscription, ever." Download button again, Homebrew, "Support KlipLoft, get a skin", say thanks on LinkedIn, rate on MacUpdate and Product Hunt | Repeat the one action |
| 12 | footer | Product links, help centre per app (including "Is KlipLoft really free?", "Return doesn't paste"), security PDF, business, privacy, license, trademark disclaimer | Answers and trust; no on-page FAQ block |

Weight and speed (measured in the DOM, desktop): page height 27,814 px; 40 requests and about 630 KB transferred at load (lazy loading on 23 of 65 images, AVIF/JPG/PNG, the largest single file is the 121 KB icon); three muted looping WebM videos with `preload=none` and a poster each; 15 scripts; 35 images lack alt text. Title and meta description carry what, price, platforms and "no subscription, no account, no tracking"; an og:image (1200x630) is set.

## What works (the lessons)
1. The hero states a pain and the product's answer in two short lines, then the price, then one button.
2. A proof line sits directly under the button (free, signed by Apple, no permissions needed): the doubts a clicker has, answered at the moment of clicking.
3. The price is said the same way in the title, the description, the hero, the closing section and the footer: free on Mac, one-time on phones, no subscription. No timer, no "only N", no discount badge.
4. The product appears with its own content (real-looking cards), not a logo and gradients.
5. A security block turns the usual fear (it sees what I copy) into four short cards.
6. A comparison against named competitors using facts the visitor can check, plus an import button, removes the cost of switching.
7. The final call to action repeats the hero button and price.

## What it does badly
- The hero carries about six choices (DMG vs App Store switch, More apps, Homebrew command, compare link) next to the one button; the hero text says "one button" but the structure is busier.
- Proof is thin and unverifiable: "1,000+ downloads in the first week" and three anonymous quotes.
- A very long page for a small tool, with a jokey "funny cursor" bonus in the middle.
- No FAQ on the page; answers sit in footer help links.
- Mac requirement (macOS 26, Apple silicon) is in a tooltip, which touch devices cannot hover; 35 images have no alt text.
- Asks visitors to rate it on MacUpdate and Product Hunt and say thanks on LinkedIn at the bottom: mild nagging.

## Compared with Toogo's landing
Toogo's first screen for a visitor is the sign-in screen: `src/views/Login.tsx` (headline "מסלול, הזמנות והוצאות במקום אחד", Google button first, then email/password, "אין לכם חשבון? מתחילים בלי") and `src/views/LoginCarousel.tsx` (three app screens in dots, `public/landing/{discover,plan,book}[-en].webp`). `index.html` has a good meta description and og tags, but the title is just "Toogo". There is no proof line, no price or free statement, no data-trust block, no FAQ, no comparison, and no closing section: it is one screen for people who already decided.

## What to take (5 to 8, each routed to one skill)
| # | Change | Skill |
|---|---|---|
| 1 | Hero: pain line first, one fact, one button; test Hebrew and English separately | toogo-marketing-craft |
| 2 | A proof line under the button with only true facts (free to try, no card, look around without an account) | toogo-marketing-craft |
| 3 | One price sentence repeated in the same words everywhere, when the money model is decided | toogo-marketing-craft |
| 4 | First screen shows a real deck card mid-swipe and the match (fixture trip) | toogo-marketing-craft |
| 5 | A data-trust block, written only after the owner checks each claim (Supabase, track.ts, AI calls) | toogo-marketing-craft |
| 6 | Four-question FAQ and a closing call to action that repeats the button | toogo-marketing-craft |
| 7 | Page title with search words in both languages (code change, owner's idea) | toogo-store-listing |
| 8 | A fact-checked compare page for "X alternative" searches | toogo-store-listing |

## What to skip and why
- "1,000+ downloads in the first week" and anonymous quotes: unverifiable; Toogo has no users to quote yet.
- "Support KlipLoft, get a skin" and the rating and LinkedIn requests: soft nagging, against rule 7.
- Homebrew, DMG vs App Store switch, the seven-product cross-sell: Toogo is one app.
- The one-click import of a competitor's history: for Toogo it would put places into a trip without swipe and match (rule 3).
- The MCP and cartoon cursor sections: unrelated.
- No urgency or scarcity was found on the page (no countdown, no stock count, no discount badge); nothing to avoid copying on that point. The "1,000+ first week" line is a popularity claim.

## What I could not read
- Any visual: screenshots return raw data; no layout, colour, type or animation review.
- Mobile at 390 wide: no resize tool; unchecked.
- The Facebook ad: not provided, so ad-to-first-screen match is not assessed. Ask the owner to send a screenshot of the ad.
- Video contents (three WebM clips, never played) and the sub-pages (/compare, /ios, /mini, /help).
- Speed as a visitor feels it: only transfer sizes were read.

All numbers above are the site's own claims or my DOM measurements as marked. Nothing was clicked, downloaded or entered.

## Seen on a phone (390 px wide, Playwright, 2026-11-25)

Opened signed out, scrolled, took screenshots. Nothing clicked, nothing entered. The page is 14,950 px tall at 390 wide, with no sideways scroll.

- **Hero (first screen):** logo, a two-line headline, one line saying what it is, then ONE big button ("Download for Mac") with a DMG / App Store switch inside it. Under it: "More apps", an install command with a Copy button, and a "Compare with Paste, Maccy, Klipto & Clipy" link. So the first screen has about five choices, more than the one button the page pretends to have. The proof line ("Free · 1,000+ downloads in the first week · Signed by Apple · No permissions needed") sits right under, and the product screenshot starts at the bottom edge of the first screen.
- **Always-on bar:** after the hero a floating pill ("Download" and "Menu") stays at the bottom, with a round chat button next to it. The Download button is always one tap away, but the two floating things cover content (they hide the last line of a quote and the bottom of the comparison table).
- **Trust section:** a laurel badge ("1,000+ downloads in the first week"), then big italic quotes signed only "KlipLoft User". The badge reads as proof; the anonymous quotes read as filler.
- **Comparison:** tabs (vs Paste, Maccy, Klipto, Clipy) over a two-column table with plain yes/no rows and price. It fits a phone without sideways scrolling, and it is the clearest section on the page. It only works because every row is a fact a visitor can check.
- **Closing section:** repeats the headline idea, the price sentence and the same download button, then adds a row of five other asks (YouTube, "get a skin", coffee, LinkedIn, rate us on two sites). The ending is noisier than the start.
- **Weight:** the page is long (about 17 screens). The comparison and the closing section are the parts that work on a phone.

What this adds for Toogo: keep one button on the first screen (the hero here has five choices), keep a persistent but small bar and make sure it never covers content, and end with one repeated button, not a row of asks.
