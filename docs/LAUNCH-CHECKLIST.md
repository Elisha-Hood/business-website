# Launch checklist

Nothing here should be done until you decide to adopt the preview. **Don't merge `preview/site-refinement` into `main` before step 3.** `main` currently deploys straight to GitHub Pages from the branch root, and the source pages carry `noindex`. Merging without switching to the production build would publish a noindexed site with preview badges and a disconnected form.

## 1. Confirm details
Work through [`CONFIRM-BEFORE-LAUNCH.md`](CONFIRM-BEFORE-LAUNCH.md). Update the copy, then remove each `<!-- confirm: … -->` comment from the page source.

## 2. Configure production
In `site.config.json`:

```json
"production": {
  "origin": "https://www.your-confirmed-domain.com",
  "basePath": "/",
  "indexable": true,
  "contactEndpoint": "https://formspree.io/f/xxxxxxx",
  "business": { "name": "Confirmed Name", "confirmed": true }
}
```

- If you stay on `https://elisha-hood.github.io/business-website/` instead of a custom domain, use `origin: "https://elisha-hood.github.io"` and `basePath: "/business-website/"`. Note that a `robots.txt` in a sub-path is ignored by crawlers, so submit the sitemap in Search Console instead.
- Keep `"indexable": false` for any staging deployment.

Run `node scripts/build.mjs --mode=production`. It fails loudly if anything is still unconfirmed.

## 3. Switch GitHub Pages to deploy the build output
The production build produces `dist/`. GitHub Pages can't run a build in “deploy from branch” mode, so either:

- **Recommended:** set Settings → Pages → Source to **GitHub Actions** and add a workflow that runs on `main` only. An example is in [`github-pages-deploy.yml.example`](github-pages-deploy.yml.example). It's deliberately not in `.github/workflows/`, so it can't run from this branch.
- Or build locally and publish `dist/` to a dedicated deploy branch.

If you use a custom domain, add it in Settings → Pages and at your DNS provider. Nothing in this branch changes domains or DNS.

## 4. Verify on the live site
- [ ] View source on each page: **no** `noindex` meta tag (except `404.html`), and `<link rel="canonical">` points at the confirmed domain with the right path.
- [ ] `https://…/sitemap.xml` lists only the five real pages, all on the confirmed domain, and each returns 200.
- [ ] `robots.txt` at the domain root allows crawling and references the sitemap.
- [ ] `curl -I https://…/` shows no `X-Robots-Tag: noindex`.
- [ ] Share preview (`og:image`, title, description) looks right, e.g. by pasting a URL into a messaging app.
- [ ] Contact form: a real submission arrives at the confirmed inbox, and success shows only after it's accepted.
- [ ] No “Preview build” note in the footer.
- [ ] Run `BASE=https://…/ node tests/smoke.mjs`. Its noindex assertions are written for the preview, so expect those to fail in production. Everything else should pass.

## 5. Search Console
- [ ] Add and verify the domain property in Google Search Console (DNS TXT record is simplest).
- [ ] Submit `sitemap.xml`.
- [ ] Use URL Inspection on the homepage and request indexing.
- [ ] Don't submit any preview or staging URL.
- [ ] Set up a Google Business Profile only with accurate details. Don't list an office address you don't have. Use a service-area business setup if appropriate.

## Later: industry pages
Pages such as “web design for contractors” are worth adding only once there's real content behind them: relevant projects, specific advice for that trade, and client permission to mention them. No city or industry pages were generated now, and none should be created just to target keywords.
