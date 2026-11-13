# Impressive Finishes screenshots: sources and capture record

All images are real browser screenshots (Chromium via Playwright, headless). No retouching beyond resizing and WebP compression; no browser chrome or archive toolbars.

## After: the live redesigned site (captured 2026-11-13)

Source: https://impressivefinishes.com/ (live, verified 2026-11-13: served by Cloudflare, `index, follow`, old WordPress URLs such as `/home-2/` and `/projects%20` 301-redirect to their new pages; MX still Google).

Each capture waited for both web fonts (Archivo, Newsreader) and every visible image to finish loading, with the pointer parked in the margin so no hover states show. Scrolling used the mouse wheel (the site ignores `scrollTo`), stopping with the section heading just under the sticky header.

| File (desktop: 960 / 1600 / 2400 px wide, from a 1440×900 viewport at 2×) | Page | Framing |
| --- | --- | --- |
| `if-live-home-desktop-*.webp` | `/` | Top of page: hero and trust strip |
| `if-live-services-desktop-*.webp` | `/` | “Painting & repair services” heading and the four service cards |
| `if-live-gallery-desktop-*.webp` | `/projects/` | Filter buttons and the top of the photo gallery |
| `if-live-estimate-desktop-*.webp` | `/contact/` | Estimate form beside “What happens next” |

Phone versions (`if-live-*-mobile-390x844@2x.webp`): the same four views at 390×844, 2× scale, iPhone-class touch emulation.

## Before: the previous WordPress site (captured 2026-11-09)

| File | Source | Notes |
| --- | --- | --- |
| `if-before-desktop-1440x900.webp` (+ `-720x450`) | https://impressivefinishes.com/ on 2026-11-09, before launch | WordPress / Elementor 4.3.5. Fonts (Poppins, Raleway) and all visible images loaded. |
| `if-before-mobile-390x844@2x.webp` | same | Phone view, same date |

## Why there are no Wayback Machine captures

The 2019 pre-WordPress site exists in the Wayback Machine (`http://www.impressivefinishes.com/`, capture `20190321043320`; confirmed via the archive.org availability API, which still returns it as the closest capture on 2026-11-13). `web.archive.org` is blocked by the egress policy of the environment this site is built in (rechecked 2026-11-13: “Blocked by egress policy”), so neither that capture nor any WordPress-era capture could be rendered or verified. No archive image has been fabricated or approximated.

The redesign’s own repository (`genaric6/Impressive-Finishes`, branch `ccr-2ab55ca3-bf15w8`) documents the WordPress setup it replaced (SiteGround hosting, Google Workspace email, `/home-2/` FAQ, the `/projects%20` link). Those facts are what the story’s “Where it started” and “Launch” scenes describe.

To add archive images later: capture at 1440×900 with the Wayback toolbar hidden, save as `if-archive-<view>-desktop-*.webp`, and record the snapshot URL and timestamp here.

## Early result

“The owner reported two leads within the first few days after launch.” Owner-provided (2026-11-13). Not claimed: that the leads came through the website, became customers, or were caused by the redesign alone.
