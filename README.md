# Foundry Digital website

A lightweight static site: plain HTML, one stylesheet (`styles.css`) and one script (`script.js`). No framework and no runtime dependencies.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Website design & redesign | `website-design.html` |
| Maintenance & support | `website-maintenance.html` |
| Our work | `work.html` |
| Free website review (contact) | `contact.html` |
| Not found | `404.html` |

## Branches and deployment

- **Production** is GitHub Pages, deployed from `main` (classic “deploy from branch”) to `https://elisha-hood.github.io/business-website/`. GitHub Pages only builds its configured source branch, so pushing other branches does not deploy anything.
- **`preview/site-refinement`** holds the refined version for review. It must not be merged until the items in [`docs/CONFIRM-BEFORE-LAUNCH.md`](docs/CONFIRM-BEFORE-LAUNCH.md) are settled and the [launch checklist](docs/LAUNCH-CHECKLIST.md) is followed. Don't add workflow files to this branch.

## Preview vs production

The source files are **preview-safe by default**:

- Every page has `<meta name="robots" content="noindex, nofollow">`.
- `_headers` sends `X-Robots-Tag: noindex, nofollow` on hosts that support it (Cloudflare Pages, Netlify). GitHub Pages ignores it, so the meta tag is the fallback.
- `robots.txt` allows crawling so crawlers can actually *see* the noindex directive.
- There are no canonical URLs or sitemap, because the production domain isn't confirmed yet.
- Items needing approval are recorded as `<!-- confirm: … -->` comments in the page source (not shown to visitors), and the footer says “Preview build, not the live site”.
- The contact form runs in a labelled preview mode and never sends anything.

Production output comes from the build script and `site.config.json`:

```bash
node scripts/build.mjs                       # preview build → dist/ (same safety defaults)
node scripts/build.mjs --mode=production     # production build → dist/
```

The production build refuses to run without a confirmed `production.origin`. If `production.indexable` is `true`, it also refuses while any `<!-- confirm: … -->` marker remains, while `business.confirmed` is false, or while the contact form has no endpoint. When it does run with indexing enabled, it removes the noindex tag, adds canonical / `og:url` / `og:image` tags, structured data limited to confirmed facts, `sitemap.xml`, and a `robots.txt` that points to it.

## Local preview

```bash
python3 -m http.server 8080      # from the repository root
# open http://localhost:8080/
```

## Tests

`tests/smoke.mjs` runs Playwright browser checks: layout at 360/390/768/1024/1440px and short landscape screens, page-top and #section navigation with Back/Forward, console and network errors, internal links, mobile menu behaviour, keyboard focus, animations and offscreen pausing, touch scrolling over the comparison slider, reduced motion, form validation, and honest submission states.

```bash
python3 -m http.server 8080 &
BASE=http://localhost:8080/ node tests/smoke.mjs
```

It needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium` on a machine that doesn't have them).

## Contact form

See [`docs/CONTACT-FORM.md`](docs/CONTACT-FORM.md).
