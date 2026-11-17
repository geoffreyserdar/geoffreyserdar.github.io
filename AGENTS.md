# Agents

Read [STYLE.md](STYLE.md) before editing this site. It is the house style: fonts, colors, type, forms, buttons, the sticky bar, photographs, and the lake chart.

`node scripts/brand-check.mjs` must pass. It fails when a form control has no shared font, when a button is not the house class `gs-btn` (chips, closes, and the other named non-actions excepted), when a control or button has an inline style, when page CSS adds a hex that is not already allowed, or when a new page does not link `/assets/brand.css` (or `/assets/house.css`, which imports it).

Bay story and sale-alert forms use `form.lead` in `/assets/brand.css`. Do not paste a new `.lead` style into a page.

Bio pages are generated. Edit `_bio/template.html`, then run `python3 _bio/build.py`. Do not hand-edit the copies.
