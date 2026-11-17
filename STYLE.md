# House style

This is the look of the site. Whittier and the bay pages are the reference. New pages, forms, and buttons follow this file. Colors and the shared form classes live in [`assets/brand.css`](assets/brand.css). [`assets/house.css`](assets/house.css) and [`assets/type.css`](assets/type.css) import that file.

`node scripts/brand-check.mjs` enforces it. The GitHub Actions job is `brand`.

## Fonts

Three families. Always name a generic at the end of a stack so a missing web font cannot fall through to Times.

| Role | Token | Stack |
| --- | --- | --- |
| Headings on pages that load the type sheet | `--font-head` | Cormorant Garamond, Georgia, Times New Roman, serif |
| Headings on bay pages | the face those pages load | Playfair Display, Georgia, Times New Roman, serif |
| Body | `--font-body` | Inter, system-ui, Segoe UI, Arial, sans-serif |
| UI, buttons, eyebrows | `--font-ui` | Montserrat, Inter, system-ui, Arial, sans-serif |

Bay pages load Playfair Display and Inter. Pages that load `type.css` load Cormorant Garamond, Inter, and Montserrat, and that sheet puts Cormorant back in `--font-head`.

Inputs, textareas, and selects set `font-family: var(--font-body)` so iOS cannot paint them in Times. The house button sets `font-family: var(--font-ui)`. Both set `-webkit-appearance: none`.

## Color

Hex values live only in `:root` in `assets/brand.css`. Everywhere else, use the token.

| Token | Value | Use |
| --- | --- | --- |
| `--parchment` | `#FAF7EF` | Page ground |
| `--sand` | `#ECE4D4` | Fact tiles and bay cards, not forms |
| `--sand-deep` | `#E4DCCB` | Photo mats |
| `--ink` | `#2C2924` | Body text |
| `--ink-head` | `#1F201C` | Headings |
| `--ink-soft` | `#4D4839` | Secondary text |
| `--brass` | `#6E5228` | Links, outlines, small UI |
| `--brass-soft` | `#C9A877` | Rules and type on dark bands |
| `--brass-hover` | `#E0C79B` | Hover on dark bands |
| `--line` | `#C9BFA9` | Hairline borders |
| `--placeholder` | `#A39B87` | Placeholder text |
| `--muted` | `#7A7468` | Quiet links |
| `--error` | `#B3261E` | Form errors |
| `--paper` | `#FFFFFF` | Text on a solid brass button |
| `--closer` | `#1D1E1A` | Reach band |
| `--footer` | `#2C2D27` | Footer |
| `--footer-muted` | `#A49C89` | Footer secondary |
| `--footer-legal` | `#8A8375` | Legal line |
| `--reach-label` | `#B9B1A2` | Small caps on dark |
| `--reach-muted` | `#A9A192` | Quieter type on dark |

`--house-page`, `--house-card`, `--house-brass`, and the other `--house-*` names are aliases of these.

## Type scale

Body is 19px, 18px under 600px, line-height 1.65. Small running text is 16px. Legal and captions can go to 14px. Nothing meant to be read goes under 13px, and the lake chart’s tiny plate labels are the exception.

Bay `h1` is Playfair Display, weight 900, `clamp(32px, 5.5vw, 50px)`. Bay `h2` is Playfair Display, 28px, weight 400, margin `44px 0 12px`. A heading inside `form.lead` uses that same face, size, and weight.

Whittier and the type sheet use Cormorant Garamond at 600 for headings, with tracked Montserrat small caps for eyebrows and UI.

## Spacing

Use the tokens: `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 22px, `--space-6` 28px, `--space-8` 44px. The reading column is about 820px. Radius on fields and buttons is `--radius` (3px).

## Forms

Story forms and bay sale alerts are `form.lead.gs-card`. The style is in `assets/brand.css` only. Copy the markup, not a `<style>` block.

- The container has no sand fill. A hairline top rule (`--line`) and padding from the spacing tokens. It sits on the parchment like the rest of the article.
- Fields match the lead form on `/lake-minnetonka-homes/`: full width, 17px `--font-body`, 14px 16px padding, sand fill (`--sand`), a 1px cool hairline, `--radius`, `-webkit-appearance: none`. Focus turns the border `--brass`.
- The button is the house button, class `submit-btn`. See [Buttons](#buttons).
- “Or text me” is a quiet link under the button, not a second button.
- The heading inside the form matches the page `h2`.
- Seller-value blocks (`.sv-offer`) keep their own layout. They still take `font-family` from this sheet so the fields are not Times. Bio pages are generated from `_bio/template.html`.

Class `gs-field` on an input only sets the inherited family and a 16px size. Inside `form.lead` the field rule above wins.

## Buttons

The house button is the funnel lead button, class `submit-btn`, copied from `/lake-minnetonka-homes/` and defined in `assets/brand.css`. Bay story forms and sale alerts use that class. Do not draw a different button in a page `<style>`.

It is full width. Fill is `--brass`. Type is `--sand`, `--font-ui` (Montserrat, then Inter), 15px, weight 600, letter-spacing 0.14em, uppercase, padding 16px, radius `--radius`. Hover fill is `--brass-soft`. It is a real button, not a text link.

A button inside `form.lead` without `submit-btn` fails the brand check.

The lake chart’s + / − / reset are part of the chart, not this button. Leave them with the chart.

## Cards

`gs-card` is the quiet container: no fill, hairline top, the spacing above. Fact tiles (`.tid`) and bay cards (`.bay-card`) may keep the sand fill. Do not put that fill behind a form.

## Sticky bar

The mobile bar (`nav.sv-bar`, under 760px) is one line, 52px plus the safe area. The ground is solid `--parchment` (`#FAF7EF`), not a translucent dark wash, and there is no backdrop blur. A brass hairline sits on top. Two equal links share the line: the main one is a brass fill, the other a brass outline. The page keeps bottom padding so the last paragraph sits fully above the bar. The bar hides while the opening line is on screen, and it hides again while a story form or sale alert is on screen so it does not cover the button. `#bay-alert` keeps a scroll margin so the heading and the email field clear the top bar. Leave that behavior alone.

From 768px up, `assets/gs-bars.js` turns the same bar into a small pill at the bottom right and keeps it off the text column. Do not stack it, do not widen it into a second footer, and do not restyle it from a page.

## Photographs

Use a real photograph, in color, sized for the column. No credit line. No picture of a phone, and no frame that shows someone walking while holding a phone. No screenshot standing in for the place.

## Lake chart

One old engraved chart of Lake Minnetonka, in `assets/lake-chart/`. Parchment plate, dark green frame, bay and town names, an optional sale pin. The chart has its own drawing colors and its own faces (Zilla Slab, Big Shoulders Display). Those files are allowlisted in the brand check. Do not restyle the chart to match a form, and do not invent a bay id. How to drop it on a page is in `assets/lake-chart/README.md`.

## Never

- A browser-default font, or Times, on an input, textarea, select, or button. Set the family on the control.
- A heavy filled beige box around a form.
- A text link standing in for the funnel button. The house button is the full-width brass `submit-btn`.
- A one-off hex in page CSS. Add a token, or use one that exists.
- An inline `style` on a form control or button.
- A new page that does not link `/assets/brand.css` or `/assets/house.css`.

## Check

```bash
node scripts/brand-check.mjs
```

After a deliberate, reviewed exception for an existing file, regenerate the allow lists:

```bash
node scripts/brand-check.mjs --write-baseline
```

iPhone shots of the forms and footers, WebKit at 390px, plus a desktop pass:

```bash
node scripts/brand-shots.mjs
```
