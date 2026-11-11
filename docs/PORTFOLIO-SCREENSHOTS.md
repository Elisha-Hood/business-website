# Impressive Finishes before/after: screenshot record

Used on the homepage ("Our work") and on `work.html`. All images are real browser screenshots (Chromium via Playwright, headless), taken on **2026-11-09** at the top of each page after web fonts and every image in the first screen had loaded. No retouching apart from WebP compression; no browser chrome.

| Side | Source | Desktop file (1440 × 900 CSS px, 1×) | Phone file (390 × 844 CSS px, 2×) |
| --- | --- | --- | --- |
| Before | https://impressivefinishes.com/ as it was on **2026-11-09**, before launch — the business's **previous website** (WordPress / Elementor 4.3.5) | `assets/work/if-before-desktop-1440x900.webp` (+ `-720x450` for small screens) | `assets/work/if-before-mobile-390x844@2x.webp` |
| After | https://impressivefinishes.com/ — **our redesign, live on the client's domain** (verified 2026-11-11: serves the redesign, `index, follow`; `www` redirects to it). Captured **2026-11-11**. | `assets/work/if-after-live-desktop-1440x900.webp` (+ `-720x450`) | `assets/work/if-after-live-mobile-390x844@2x.webp` |

Checks at capture time: same business on both (phone 770-569-5999); before used Poppins and Raleway, after used Archivo and Newsreader, all loaded; no broken images; no popups or cookie banners in view. The only contact detail shown is the business phone number.

## Why "before" is the current site, not the 2019 original

The intended "before" was the original pre-WordPress site from the Wayback Machine (`http://www.impressivefinishes.com/`, capture **20190321043320**, i.e. 2019-03-21 04:33:20 UTC; confirmed via the archive.org availability API as the most recent capture, with earlier ones from 2016-04-10, 2017-07-14 and 2018-06-17). `web.archive.org` and `archive.ph` are explicitly blocked by the egress policy of the environment this was built in ("Blocked by egress policy"), and the original asset host `static.sites.yp.com` does not respond, so that capture could not be rendered. At the owner's request the current live site is used instead, and it is labelled "current site", not "archived".

To switch to the 2019 version later: replace the two `if-before-*` files with screenshots of the archived page at the same sizes, and change the "Before · previous site" label and the caption in the page generator to "Previous website · archived 2019".

## Launch (2026-11-11)

The redesign is live on impressivefinishes.com, so the "after" was re-captured from the live domain (it now shows a different hero photo and a trust bar than the earlier preview capture) and saved under new `if-after-live-*` names so browsers don't show the cached preview images. Labels are now "Before · previous site" / "After · live site", and `work.html` marks the project as completed. A re-check of the Wayback Machine on 2026-11-11 was still refused ("Blocked by egress policy"), so the "before" remains the WordPress site captured on 2026-11-09.
