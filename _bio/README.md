# Link-in-bio pages

One template feeds every bio link. Edit `_bio/template.html` (layout, cards, and the value form) or the platform table in `_bio/build.py`, then regenerate:

```bash
python3 _bio/build.py
```

That writes a full static `index.html` at each path. The pages are copies, not redirects: no meta refresh and no JavaScript redirect. Commit the generated files with the template.

Check that the committed copies still match:

```bash
python3 _bio/build.py --check
```

CI runs that check on pull requests and on pushes to `main` (`.github/workflows/bio-pages.yml`). It fails if a page was edited by hand or the template changed without a regenerate.

## Paths

| Path | utm_source | utm_medium | utm_content | Interest id | Robots | Canonical |
| --- | --- | --- | --- | --- | --- | --- |
| `/ig/` | instagram | social | | `seller_value_ig` | noindex,follow | `/social/` |
| `/tt/` | tiktok | social | | `seller_value_tt` | noindex,follow | `/social/` |
| `/fb/` | facebook | social | profile | `seller_value_fb` | noindex,follow | `/social/` |
| `/fbpage/` | facebook | social | page | `seller_value_fbpage` | noindex,follow | `/social/` |
| `/li/` | linkedin | social | | `seller_value_li` | noindex,follow | `/social/` |
| `/x/` | x | social | | `seller_value_x` | noindex,follow | `/social/` |
| `/yt/` | youtube | video | | `seller_value_yt` | noindex,follow | `/social/` |
| `/gmb/` | gmb | organic | profile | `seller_value_gmb` | noindex,follow | `/social/` |
| `/gmbpost/` | gmb | post | | `seller_value_gmbpost` | noindex,follow | `/social/` |
| `/lt/` | linktree | social | | `seller_value_lt` | noindex,follow | `/social/` |
| `/nd/` | nextdoor | social | | `seller_value_nd` | noindex,follow | `/social/` |
| `/social/` | social-hub | referral | | `seller_value_social` | index,follow | `/social/` |

Every card link adds that page’s utm tags plus the card’s `utm_campaign`. The last card, “Inherited a house?”, links to `/probate/` with those same tags (`utm_campaign=probate`). `og:url` is the page’s own URL. `/social/` is the indexable hub and is listed in `sitemap.xml`. The other paths stay out of the sitemap.

The value form posts `interest` to Formspree and `local` to the Twilio lead alert as a plain string. This repo has no allowlist. Town and guide pages already send their own `seller_value_*` ids (`seller_value_ig`, `seller_value_mound`, `seller_value_whittier-minneapolis`, and others), so each bio path uses `seller_value_<short>` the same way. `/tt/` sends `seller_value_tt`.

On a platform’s own page, that platform’s icon is left out of the footer (and off the `/social/` “Follow along” row, which shows every icon). Instagram is only `https://www.instagram.com/geoffreyserdar/`. Facebook is only `https://www.facebook.com/geoffrey.serdar`. Campaign stubs (`buyers-*`, `northeast-*`, `saintpaul-*`, `victoria-*`, `zimmerman-*`) and `/card/`, `/zillow/`, `/homes/`, `/pin/` are not generated here.

## Images

Thumbnails live in `/bio-img/`: 480×270 WebP, each under 30KB, shown at 124×70. The header portrait is a 144px WebP under 10KB made from `/img/geoffrey.jpg`, shown at 72px. The first four cards load eager; the last two load lazy.

## Undo

Revert the commit that added this generator. That restores `/ig/` and `/tt/` to the previous link pages, restores the other paths to their redirects, and removes `/nd/`, `/social/`, `/bio-img/`, and `_bio/`. Also remove the `/social/` line from `sitemap.xml` if the revert does not.
