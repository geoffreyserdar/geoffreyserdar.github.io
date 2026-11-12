#!/usr/bin/env python3
"""Generate the link-in-bio pages from _bio/template.html.

    python3 _bio/build.py          # write each path
    python3 _bio/build.py --check  # fail if a committed copy drifted

Each path is a full static page. Nothing here emits a redirect.
"""

from __future__ import annotations

import html
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(__file__).resolve().parent / "template.html"
ORIGIN = "https://geoffreyserdar.com"
HUB = ORIGIN + "/social/"

# Profile URLs already published on the site. Instagram and Facebook are
# Geoffrey's personal accounts only. Nextdoor is absent: the repo has a
# personal profile and post links, not a business page, so no icon is emitted.
SOCIALS = [
    {
        "platform": "youtube",
        "label": "YouTube @RealTalkGeo",
        "href": "https://www.youtube.com/@RealTalkGeo",
        "svg": '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M23 12s0-3.4-.4-4.9a2.8 2.8 0 0 0-2-2C18.8 4.6 12 4.6 12 4.6s-6.8 0-8.6.5a2.8 2.8 0 0 0-2 2C1 8.6 1 12 1 12s0 3.4.4 4.9a2.8 2.8 0 0 0 2 2c1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.8 2.8 0 0 0 2-2C23 15.4 23 12 23 12zM9.8 15.5V8.5L16 12l-6.2 3.5z"/></svg>',
    },
    {
        "platform": "instagram",
        "label": "Instagram @geoffreyserdar",
        "href": "https://www.instagram.com/geoffreyserdar/",
        "svg": '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none"/></svg>',
    },
    {
        "platform": "tiktok",
        "label": "TikTok @geoffrey.serdar",
        "href": "https://www.tiktok.com/@geoffrey.serdar",
        "svg": '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M14.2 3c.3 2.2 1.6 3.7 3.8 4.1v2.4a6.3 6.3 0 0 1-3.8-1.2v6.4a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.6a3.1 3.1 0 1 0 2.2 3V3h2.6z"/></svg>',
    },
    {
        "platform": "facebook",
        "label": "Facebook Geoffrey Serdar",
        "href": "https://www.facebook.com/geoffrey.serdar",
        "svg": '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7H16l.5-4h-3V8.8c0-.5.3-.8.9-.8z"/></svg>',
    },
    {
        "platform": "linkedin",
        "label": "LinkedIn Geoffrey Serdar",
        "href": "https://www.linkedin.com/in/geoffreyserdar/",
        "svg": '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M5 3.2A1.8 1.8 0 1 0 5 6.8 1.8 1.8 0 0 0 5 3.2zM3.3 8.3H6.7V21H3.3zM9.2 8.3h3.3v1.7h.1c.5-1 1.7-2 3.4-2 3.6 0 4.3 2.4 4.3 5.5V21h-3.4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H9.2z"/></svg>',
    },
    {
        "platform": "x",
        "label": "X @GeoffreySerdar",
        "href": "https://x.com/GeoffreySerdar",
        "svg": '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M14.7 10.3 22 2h-2.2l-6.2 7.1L8.7 2H2l7.7 11.1L2 22h2.2l6.8-7.8 5.4 7.8H22l-7.3-11.7zm-2.4 2.8-1.6-2.3L4.4 3.6h2.7l4.1 5.9 1.6 2.3 6.7 9.6h-2.7z"/></svg>',
    },
]

# Interest ids are opaque labels. The form posts `interest` to Formspree and
# `local` to the Twilio lead alert with no allowlist in this repo. Existing
# pages already send distinct seller_value_* ids, so each bio path does too.
PLATFORMS = [
    {"dir": "ig", "source": "instagram", "medium": "social", "content": None, "interest": "seller_value_ig", "omit": "instagram", "indexable": False},
    {"dir": "tt", "source": "tiktok", "medium": "social", "content": None, "interest": "seller_value_tt", "omit": "tiktok", "indexable": False},
    {"dir": "fb", "source": "facebook", "medium": "social", "content": "profile", "interest": "seller_value_fb", "omit": "facebook", "indexable": False},
    {"dir": "fbpage", "source": "facebook", "medium": "social", "content": "page", "interest": "seller_value_fbpage", "omit": "facebook", "indexable": False},
    {"dir": "li", "source": "linkedin", "medium": "social", "content": None, "interest": "seller_value_li", "omit": "linkedin", "indexable": False},
    {"dir": "x", "source": "x", "medium": "social", "content": None, "interest": "seller_value_x", "omit": "x", "indexable": False},
    {"dir": "yt", "source": "youtube", "medium": "video", "content": None, "interest": "seller_value_yt", "omit": "youtube", "indexable": False},
    {"dir": "gmb", "source": "gmb", "medium": "organic", "content": "profile", "interest": "seller_value_gmb", "omit": None, "indexable": False},
    {"dir": "gmbpost", "source": "gmb", "medium": "post", "content": None, "interest": "seller_value_gmbpost", "omit": None, "indexable": False},
    {"dir": "lt", "source": "linktree", "medium": "social", "content": None, "interest": "seller_value_lt", "omit": None, "indexable": False},
    {"dir": "nd", "source": "nextdoor", "medium": "social", "content": None, "interest": "seller_value_nd", "omit": "nextdoor", "indexable": False},
    {"dir": "social", "source": "social-hub", "medium": "referral", "content": None, "interest": "seller_value_social", "omit": None, "indexable": True},
]

CARDS = [
    {
        "title": "Battle Creek home tour",
        "subtitle": "Watch the video on YouTube",
        "href": "https://youtu.be/oNHnwYHlcfk",
        "img": "/bio-img/battle-creek-tour.webp",
        "alt": "Battle Creek home tour on YouTube",
        "play": True,
        "campaign": "battle-creek-tour",
        "lazy": False,
    },
    {
        "title": "Battle Creek, St. Paul",
        "subtitle": "Every spot on the tour, on one map",
        "href": "/battle-creek-saint-paul/",
        "img": "/bio-img/battle-creek-saint-paul.webp",
        "alt": "The downtown St. Paul skyline",
        "play": False,
        "campaign": "battle-creek-saint-paul",
        "lazy": False,
    },
    {
        "title": "1904 Northeast Minneapolis duplex",
        "subtitle": "Watch the video on YouTube",
        "href": "https://www.youtube.com/watch?v=YLLG9tu8wpQ",
        "img": "/bio-img/duplex-tour.webp",
        "alt": "1904 Northeast Minneapolis duplex",
        "play": True,
        "campaign": "duplex-tour",
        "lazy": False,
    },
    {
        "title": "Walk Whittier, Minneapolis",
        "subtitle": "Coffee, pho, Mia and MCAD",
        "href": "/whittier-minneapolis/",
        "img": "/bio-img/whittier-mia.webp",
        "alt": "The Minneapolis Institute of Art exterior",
        "play": False,
        "campaign": "whittier-condo",
        "lazy": False,
    },
    {
        "title": "Lake Minnetonka homes",
        "subtitle": "Homes on and near the lake",
        "href": "/lake-minnetonka-homes/",
        "img": "/bio-img/lake-minnetonka-homes.webp",
        "alt": "A home on Excelsior Bay, Lake Minnetonka",
        "play": False,
        "campaign": "lake-minnetonka-homes",
        "lazy": True,
    },
    {
        "title": "Lake Minnetonka weekly market",
        "subtitle": "What sold around the lake this week",
        "href": "/lake-minnetonka-weekly/",
        "img": "/bio-img/weekly-market.webp",
        "alt": "The steamboat Minnehaha on Lake Minnetonka",
        "play": False,
        "campaign": "weekly-market",
        "lazy": True,
    },
]

IMAGES = {
    "bio-img/geoffrey-face.webp": 10_000,
    "bio-img/battle-creek-tour.webp": 30_000,
    "bio-img/battle-creek-saint-paul.webp": 30_000,
    "bio-img/duplex-tour.webp": 30_000,
    "bio-img/whittier-mia.webp": 30_000,
    "bio-img/lake-minnetonka-homes.webp": 30_000,
    "bio-img/weekly-market.webp": 30_000,
}

# Campaign stubs and other short links this generator must never write.
UNTOUCHED = {
    "buyers", "northeast", "saintpaul", "victoria", "zimmerman",
    "card", "zillow", "homes", "pin",
}


def with_utm(url: str, platform: dict, campaign: str) -> str:
    extra = [("utm_source", platform["source"]), ("utm_medium", platform["medium"])]
    if platform["content"]:
        extra.append(("utm_content", platform["content"]))
    extra.append(("utm_campaign", campaign))
    parts = urlsplit(url)
    query = urlencode(parse_qsl(parts.query, keep_blank_values=True) + extra)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


def social_nav(platform: dict) -> str:
    omit = platform["omit"]
    links = []
    for item in SOCIALS:
        if item["platform"] == omit:
            continue
        links.append(
            '      <a href="%s" aria-label="%s" rel="noopener">%s</a>'
            % (html.escape(item["href"], quote=True), html.escape(item["label"]), item["svg"])
        )
    return '<nav class="socs" aria-label="Social profiles">\n' + "\n".join(links) + "\n    </nav>"


def follow_block(platform: dict) -> str:
    if platform["dir"] != "social":
        return ""
    return (
        '  <section class="follow" aria-label="Follow along">\n'
        '    <p class="label">Follow along</p>\n'
        "    " + social_nav(platform).strip() + "\n"
        "  </section>"
    )


def cards_html(platform: dict) -> str:
    blocks = []
    for card in CARDS:
        href = html.escape(with_utm(card["href"], platform, card["campaign"]), quote=True)
        rel = ' rel="noopener"' if card["href"].startswith("http") else ""
        loading = "lazy" if card["lazy"] else "eager"
        play = '\n        <span class="play" aria-hidden="true"></span>' if card["play"] else ""
        blocks.append(
            '    <a class="card" id="%s" href="%s"%s>\n'
            '      <span class="thumb">\n'
            '        <img src="%s" alt="%s" width="124" height="70" loading="%s" decoding="async">%s\n'
            "      </span>\n"
            '      <span class="copy"><span class="t">%s</span><span class="s">%s</span></span>\n'
            "    </a>"
            % (
                card["campaign"],
                href,
                rel,
                card["img"],
                html.escape(card["alt"]),
                loading,
                play,
                html.escape(card["title"]),
                html.escape(card["subtitle"]),
            )
        )
    return "\n".join(blocks)


def render(platform: dict, template: str) -> str:
    path = ORIGIN + "/" + platform["dir"] + "/"
    robots = "index,follow" if platform["indexable"] else "noindex,follow"
    canonical = path if platform["indexable"] else HUB
    page = template
    replacements = {
        "__ROBOTS__": robots,
        "__CANONICAL__": canonical,
        "__OG_URL__": path,
        "__INTEREST__": platform["interest"],
        "__FOLLOW__": follow_block(platform),
        "__CARDS__": cards_html(platform),
        "__SOCIAL__": social_nav(platform),
    }
    for key, value in replacements.items():
        if key not in page:
            raise SystemExit("template is missing %s" % key)
        page = page.replace(key, value)
    if "__" in page:
        raise SystemExit("unreplaced placeholder left in /%s/" % platform["dir"])
    validate(platform, page)
    return page


def validate(platform: dict, page: str) -> None:
    directory = platform["dir"]
    path = ORIGIN + "/" + directory + "/"
    robots = "index,follow" if platform["indexable"] else "noindex,follow"
    canonical = path if platform["indexable"] else HUB
    problems = []

    def need(cond, message):
        if not cond:
            problems.append(message)

    need('name="robots" content="%s"' % robots in page, "robots")
    need('rel="canonical" href="%s"' % canonical in page, "canonical")
    need('property="og:url" content="%s"' % path in page, "og:url")
    need('var I="%s"' % platform["interest"] in page, "interest script")
    need('data-sv="%s"' % platform["interest"] in page, "interest data-sv")
    need("http-equiv=\"refresh\"" not in page and "http-equiv='refresh'" not in page, "meta refresh")
    need("location.replace" not in page, "js redirect")
    need("New:" not in page, "New: tag")
    need(page.count('width="124" height="70"') == 6, "thumb dimensions")
    need(page.count('loading="lazy"') == 2, "lazy thumbs")
    need(page.count('loading="eager"') == 5, "eager images")
    need(page.count('class="play"') == 2, "play badges")
    need("What’s my home worth?" in page, "sticky bar")
    need('href="sms:+19522583100"' in page, "text link")
    need("Lake Minnetonka sales each week" in page, "top bar")
    need("Serdar+Partners at Compass ·" in page, "footer line")
    if directory == "social":
        need(page.count('class="follow"') == 1, "follow row")
        need(">Follow along<" in page, "follow label")
    else:
        need("Follow along" not in page, "follow row only on /social/")
    for item in SOCIALS:
        present = item["href"] in page
        if item["platform"] == platform["omit"]:
            need(not present, "own platform icon still present: " + item["href"])
        else:
            need(present, "missing social " + item["href"])
    for card in CARDS:
        href = with_utm(card["href"], platform, card["campaign"])
        need(html.escape(href, quote=True) in page, "missing card " + card["campaign"])
        query = dict(parse_qsl(urlsplit(href).query))
        need(query.get("utm_source") == platform["source"], card["campaign"] + " utm_source")
        need(query.get("utm_medium") == platform["medium"], card["campaign"] + " utm_medium")
        need(query.get("utm_campaign") == card["campaign"], card["campaign"] + " campaign")
        if platform["content"]:
            need(query.get("utm_content") == platform["content"], card["campaign"] + " utm_content")
        else:
            need("utm_content" not in query, card["campaign"] + " unexpected utm_content")
    if directory == "tt":
        need("seller_value_ig" not in page, "tiktok page still uses seller_value_ig")
    if problems:
        raise SystemExit("/%s/ failed checks: %s" % (directory, ", ".join(problems)))


def check_images() -> None:
    for rel, limit in IMAGES.items():
        path = ROOT / rel
        if not path.is_file():
            raise SystemExit("missing image %s" % rel)
        blob = path.read_bytes()
        if blob[:4] != b"RIFF" or blob[8:12] != b"WEBP":
            raise SystemExit("%s is not a webp" % rel)
        if not (500 <= len(blob) <= limit):
            raise SystemExit("%s is %s bytes; limit is %s" % (rel, len(blob), limit))


def pages(template: str) -> dict[str, str]:
    dirs = [item["dir"] for item in PLATFORMS]
    if len(dirs) != len(set(dirs)):
        raise SystemExit("duplicate platform directory")
    overlap = set(dirs) & UNTOUCHED
    if overlap:
        raise SystemExit("refusing to write protected paths: %s" % sorted(overlap))
    return {item["dir"]: render(item, template) for item in PLATFORMS}


def main(argv: list[str]) -> int:
    check_only = argv[1:] == ["--check"]
    if argv[1:] not in ([], ["--check"]):
        print("usage: python3 _bio/build.py [--check]", file=sys.stderr)
        return 2
    template = TEMPLATE.read_text(encoding="utf-8")
    check_images()
    rendered = pages(template)
    drifted = []
    for directory, page in rendered.items():
        dest = ROOT / directory / "index.html"
        if check_only:
            current = dest.read_text(encoding="utf-8") if dest.is_file() else ""
            if current != page:
                drifted.append(directory)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(page, encoding="utf-8")
            print("wrote %s/index.html" % directory)
    if drifted:
        print("bio pages drifted from _bio/template.html: " + ", ".join("/" + d + "/" for d in drifted), file=sys.stderr)
        print("run: python3 _bio/build.py", file=sys.stderr)
        return 1
    if check_only:
        print("bio pages match the template (%s paths)" % len(rendered))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
