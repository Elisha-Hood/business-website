# Impressive Finishes before/after: screenshot record

Used on the homepage ("Our work") and on `work.html`. All four images are real browser screenshots (Chromium via Playwright, headless), taken on **2026-11-09** at the top of each page after web fonts and every image in the first screen had loaded. No retouching apart from WebP compression; no browser chrome.

| Side | Source | Desktop file (1440 × 900 CSS px, 1×) | Phone file (390 × 844 CSS px, 2×) |
| --- | --- | --- | --- |
| Before | https://impressivefinishes.com/ — the business's **current live website** (WordPress / Elementor 4.3.5) | `assets/work/if-before-desktop-1440x900.webp` (+ `-720x450` for small screens) | `assets/work/if-before-mobile-390x844@2x.webp` |
| After | https://impressive-finishes.pages.dev/ — **our redesign, on a preview address** (sends `noindex, nofollow`; launch on the client's domain not yet verified) | `assets/work/if-after-desktop-1440x900.webp` (+ `-720x450`) | `assets/work/if-after-mobile-390x844@2x.webp` |

Checks at capture time: same business on both (phone 770-569-5999); before used Poppins and Raleway, after used Archivo and Newsreader, all loaded; no broken images; no popups or cookie banners in view. The only contact detail shown is the business phone number.

## Why "before" is the current site, not the 2019 original

The intended "before" was the original pre-WordPress site from the Wayback Machine (`http://www.impressivefinishes.com/`, capture **20190321043320**, i.e. 2019-03-21 04:33:20 UTC; confirmed via the archive.org availability API as the most recent capture, with earlier ones from 2016-04-10, 2017-07-14 and 2018-06-17). `web.archive.org` and `archive.ph` are explicitly blocked by the egress policy of the environment this was built in ("Blocked by egress policy"), and the original asset host `static.sites.yp.com` does not respond, so that capture could not be rendered. At the owner's request the current live site is used instead, and it is labelled "current site", not "archived".

To switch to the 2019 version later: replace the two `if-before-*` files with screenshots of the archived page at the same sizes, and change the "Before · current site" label and the caption in the page generator to "Previous website · archived 2019".

## When the redesign launches

Re-capture "after" from the production domain, change "After · redesign preview" and the caption, and drop the "Redesign preview, not launched yet" chip on `work.html`.
