# Toogo: logo guidelines

## 1. The logo
- **Idea:** the two o's in "toogo" walk side by side, and the second one steps up. Two people going together, one
  already on the next step.
- **Versions:**
  - **Horizontal (primary):** `toogo-horizontal`
  - **Stacked:** `toogo-stacked`
  - **Symbol only:** `toogo-symbol`
  - **Wordmark only:** `toogo-wordmark`
- **Files:**
  - `masters/` holds the SVG masters for screens and printers. Each version comes in four colourings:
    full colour (no suffix), `-red`, `-black` and `-white`.
  - `png/` holds ready-made PNGs with transparent backgrounds.
  - `web/` holds the favicon, the app icons and the PWA icons.
- **Wordmark:** the letters are drawn from circles and straight lines with one stroke width. The raised o is part of the
  name. Never type "toogo" in a font in place of the logo.

## 2. Clear space
Keep a clear zone around the logo on all sides that is **the width of one ring of the symbol**. When the wordmark is
used alone, use the width of one of its o's. The zone scales with the logo.

## 3. Minimum size
| Version | Screen | Print |
|---|---|---|
| Horizontal | 96 px wide | 25 mm wide |
| Stacked | 64 px wide | 18 mm wide |
| Symbol | 24 px | 6 mm |
| Symbol, 16–48 px | use `toogo-symbol-small` (heavier rings, wider gap) | — |

## 4. Colour
| Name | HEX | RGB | CMYK (approx.) | Pantone (nearest) |
|---|---|---|---|---|
| Toogo red | #BC002D | 188 0 45 | 0 100 76 26 | 200 C |
| Ink | #1F1A17 | 31 26 23 | 0 16 26 88 | Black 7 C |
| Cream | #FAF7F2 | 250 247 242 | 0 1 3 2 | — |

The CMYK and Pantone values are conversions. Check them against a printed swatch before you print.

Contrast: red on white is 6.6 : 1 and red on cream is 6.2 : 1. Both pass WCAG AA, including for small text.

**Approved logo and background pairs:**
- Red symbol with ink name, on white or cream. This is the primary version.
- All white, on Toogo red or on ink. This version has slightly thinner rings, because white on a dark background
  looks heavier.
- All red, or all black, when only one colour is available.
- On photos, use the white version on a calm, dark area.

**App icon:** a red tile with the white symbol (`web/toogo-app-icon.svg`). Inside the product and on documents, the logo
is red on white.

## 5. Typography
- **Interface and body text:** the system font the app already uses (SF Pro / SF Hebrew, with system-ui as the
  fallback). It sits well next to the round wordmark and needs no licence.
- **Never** set the name in another typeface. Use the wordmark file.

## 6. Don'ts
- Don't stretch, squash or rotate the logo.
- Don't level the raised o, or raise any other letter.
- Don't recolour the logo outside the palette, or swap the colours (an ink symbol with a red name).
- Don't add shadows, outlines, gradients or effects.
- Don't rearrange or resize the parts of a lockup.
- Don't use the regular symbol below 24 px. Use the small cut instead.
- Don't place the logo on busy backgrounds without a solid area behind it.

## 7. Before launch
- Run a trademark search for "Toogo" in Israel, the EU and the US, and check domains and app-store names. None of this
  has been checked yet.
- Swap the icons in `public/` and update the app name in `manifest.webmanifest` and `index.html`.
