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

Inputs, textareas, and selects set `font-family: inherit` so they use the page’s body stack. iOS otherwise paints them in Times. The house button sets `font-family: var(--font-head)`, the same face as the heading. Both set `-webkit-appearance: none`.

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
- Fields are full width, 16px type (so iOS does not zoom), 14px 16px padding, a 1px `--line` border, `--radius`, `font-family: inherit`, `-webkit-appearance: none`. Placeholder is `--placeholder`. Focus is a brass border and a soft brass ring.
- The button is the house button, `gs-btn`. See [Buttons](#buttons).
- “Or text me” is not a second button. It is a quiet link in the body font, `--muted`, weight 400, with a softer underline than the button.
- The heading inside the form matches the page `h2`.
- Fields stay in the body font, with a hairline `--line` border, no fill, and an italic `--placeholder`.
- Seller-value blocks (`.sv-offer`) keep their own layout. They still take `font-family` from this sheet so the fields are not Times. Bio pages are generated from `_bio/template.html`.

Class `gs-field` on an input only sets the inherited family and a 16px size.

## Buttons

There is one house button, `gs-btn`, and it lives only in `assets/brand.css`. Bay forms, sale alerts, and any other form action use that class. Do not draw a new button in a page `<style>`.

It is set in the heading face (`--font-head`: Playfair Display on a bay page, Cormorant Garamond where the type sheet has replaced the token). Size is 18px, weight 400, sentence case, letter-spacing 0. The words are `--brass`. A 1px brass hairline sits under the words. There is no fill and no boxed outline. It stays on one line at 390px. Hover turns the words and the hairline to `--ink-head`. Focus is a brass outline, offset from the words.

“Or text me” sits under it in the body font, smaller, in `--muted`.

A `<button>` that is not `gs-btn` fails the brand check, unless it is a control that is not this action: a chip, a close, a video play, a sort, a gallery or floor-plan toggle, the seller-value button, or an older page submit that already has its own class (`submit-btn`, `nb-btn`, `cta-primary`, `form-submit`). A new button uses `gs-btn`.

The lake chart’s + / − / reset use this same face and the brass color. They are not filled squares. The tap target stays at least 44px. Do not move them, and do not restyle the chart drawing to match a form.

## Cards

`gs-card` is the quiet container: no fill, hairline top, the spacing above. Fact tiles (`.tid`) and bay cards (`.bay-card`) may keep the sand fill. Do not put that fill behind a form.

## Sticky bar

The mobile bar (`nav.sv-bar`, under 760px) is one line: 40px tall, nowrap, parchment ground, a brass hairline on top, two equal links. It hides while the opening line or the form is on screen. Leave that behavior alone.

From 768px up, `assets/gs-bars.js` turns the same bar into a small pill at the bottom right and keeps it off the text column. Do not stack it, do not widen it into a second footer, and do not restyle it from a page.

## Photographs

Use a real photograph, in color, sized for the column. No credit line. No picture of a phone, and no frame that shows someone walking while holding a phone. No screenshot standing in for the place.

## Lake chart

One old engraved chart of Lake Minnetonka, in `assets/lake-chart/`. Parchment plate, dark green frame, bay and town names, an optional sale pin. The chart has its own drawing colors and its own faces (Zilla Slab, Big Shoulders Display). Those files are allowlisted in the brand check. Do not restyle the chart to match a form, and do not invent a bay id. How to drop it on a page is in `assets/lake-chart/README.md`.

## Never

- A browser-default font, or Times, on an input, textarea, select, or button. Set the family on the control.
- A heavy filled beige box around a form.
- A bold, full-width, blocky button, or a boxed outline standing in for one. The house button is type.
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
