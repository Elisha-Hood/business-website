#!/usr/bin/env node
// Static build for the site. No dependencies.
//
//   node scripts/build.mjs                    -> preview build in dist/ (noindex everywhere, no canonicals/sitemap)
//   node scripts/build.mjs --mode=production  -> production build; needs site.config.json production.origin
//
// The source files at the repository root are already preview-safe and can be served directly.
// Production indexing only happens when production.indexable is deliberately set to true, and the build
// refuses to do that while any <!-- confirm: ... --> review markers remain.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const mode = args.mode || 'preview';
const out = resolve(root, args.out || 'dist');
if (!['preview', 'production'].includes(mode)) fail(`Unknown --mode=${mode}. Use preview or production.`);

const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const pages = readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const errors = [];
const warnings = [];

function fail(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1); }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// ---------- basic page checks (both modes) ----------
const seenTitles = new Map();
const seenDescs = new Map();
const sources = {};
for (const file of pages) {
  const html = readFileSync(join(root, file), 'utf8');
  sources[file] = html;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (!title) errors.push(`${file}: missing <title>`);
  if (!desc) errors.push(`${file}: missing meta description`);
  if (h1s !== 1) errors.push(`${file}: expected exactly one <h1>, found ${h1s}`);
  if (!/<meta name="robots" content="noindex, nofollow">/.test(html)) errors.push(`${file}: source page must keep the preview noindex meta tag`);
  if (!html.includes('<!-- build:seo -->')) errors.push(`${file}: missing <!-- build:seo --> marker`);
  if (title && seenTitles.has(title)) errors.push(`${file}: duplicate title (also ${seenTitles.get(title)})`);
  if (desc && seenDescs.has(desc)) errors.push(`${file}: duplicate description (also ${seenDescs.get(desc)})`);
  seenTitles.set(title, file); seenDescs.set(desc, file);
}

// ---------- production settings ----------
const prod = config.production || {};
let origin = null, basePath = '/', indexable = false, endpoint = null;
if (mode === 'production') {
  origin = prod.origin;
  if (!origin) fail('production.origin is not set in site.config.json. Set it to the confirmed domain, e.g. "https://www.example.com".');
  let u;
  try { u = new URL(origin); } catch { fail(`production.origin "${origin}" is not a valid URL.`); }
  if (u.protocol !== 'https:') fail('production.origin must use https://');
  if (u.pathname !== '/' || u.search || u.hash) fail('production.origin must be just the scheme and host. Put any sub-path in production.basePath.');
  origin = u.origin;
  basePath = ('/' + (prod.basePath || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
  indexable = prod.indexable === true;
  endpoint = prod.contactEndpoint || null;
  if (endpoint) {
    try { if (new URL(endpoint).protocol !== 'https:') throw 0; } catch { fail('production.contactEndpoint must be an https:// URL.'); }
  } else if (args['allow-missing-endpoint'] !== 'true') {
    fail('production.contactEndpoint is not set, so the contact form could not deliver anything. Configure it, or pass --allow-missing-endpoint for a test build (the form keeps its "not connected" notice).');
  } else {
    warnings.push('Contact form has no endpoint: it keeps its visible "not connected" notice.');
  }
  if (indexable) {
    const confirmLeft = pages.flatMap((f) => [...sources[f].matchAll(/<!-- confirm: (.*?) -->/g)].map((m) => `${f}: ${m[1]}`));
    if (confirmLeft.length) fail(`Indexing is enabled but these items are still marked "to confirm":\n  - ${[...new Set(confirmLeft)].join('\n  - ')}\nConfirm them, update the copy, and remove the markers first.`);
    if (!prod.business || prod.business.confirmed !== true) fail('Indexing is enabled but production.business.confirmed is not true.');
    if (!endpoint) fail('Indexing is enabled but the contact form has no endpoint.');
  }
}
if (errors.length) fail(`Page checks failed:\n  - ${errors.join('\n  - ')}`);

const urlFor = (file) => origin + basePath + (file === 'index.html' ? '' : file);

// ---------- write output ----------
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['styles.css', 'script.js']) cpSync(join(root, f), join(out, f));
if (existsSync(join(root, 'assets'))) cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });

for (const file of pages) {
  let html = sources[file];
  if (mode === 'production') {
    // preview-only notices go, except the form notice when there is no endpoint
    html = html.replace(/[ \t]*<!-- preview-only:start -->([\s\S]*?)<!-- preview-only:end -->\n?/g, (m, inner) =>
      (!endpoint && inner.includes('form-mode')) ? inner.replace('Preview only: this form', 'This form') : '');
    if (indexable && file !== '404.html') {
      html = html.replace(/[ \t]*<!-- Preview default:[^\n]*\n[ \t]*<meta name="robots" content="noindex, nofollow">\n/, '');
    }
    if (endpoint) html = html.replace('data-endpoint=""', `data-endpoint="${esc(endpoint)}"`);

    const crumb = decode((html.match(/<span aria-current="page">([^<]*)<\/span>/) || [])[1] || '');
    const seo = [];
    if (file === '404.html') {
      seo.push(`<base href="${esc(basePath)}">`);
    } else {
      seo.push(`<link rel="canonical" href="${esc(urlFor(file))}">`);
      seo.push(`<meta property="og:url" content="${esc(urlFor(file))}">`);
    }
    if (existsSync(join(root, 'assets/og-image.png'))) {
      const img = origin + basePath + 'assets/og-image.png';
      seo.push(`<meta property="og:image" content="${esc(img)}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', `<meta name="twitter:image" content="${esc(img)}">`);
    }
    // Structured data only for confirmed facts: business name + URL, service area, and breadcrumb structure.
    if (indexable && prod.business && prod.business.confirmed === true && file !== '404.html') {
      const ld = file === 'index.html'
        ? [{ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: prod.business.name, url: origin + basePath,
             description: 'Website design, redesign and support for small businesses.',
             ...(Array.isArray(prod.business.areaServed) && prod.business.areaServed.length
               ? { areaServed: prod.business.areaServed.map((name) => ({ '@type': 'Place', name })) } : {}) },
           { '@context': 'https://schema.org', '@type': 'WebSite', name: prod.business.name, url: origin + basePath }]
        : [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: origin + basePath },
            { '@type': 'ListItem', position: 2, name: crumb, item: urlFor(file) }] }];
      for (const block of ld) seo.push(`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`);
    }
    html = html.replace('<!-- build:seo -->', seo.join('\n  '));
  }
  writeFileSync(join(out, file), html);
}

// robots / headers / sitemap
const security = '  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n';
if (mode === 'production' && indexable) {
  const urls = pages.filter((f) => f !== '404.html').map((f) => `  <url><loc>${esc(urlFor(f))}</loc></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}${basePath}sitemap.xml\n`);
  writeFileSync(join(out, '_headers'), `/*\n${security}`);
} else {
  cpSync(join(root, 'robots.txt'), join(out, 'robots.txt'));
  writeFileSync(join(out, '_headers'), `/*\n  X-Robots-Tag: noindex, nofollow\n${security}`);
}

console.log(`✔ ${mode} build → ${out}`);
console.log(`  pages: ${pages.join(', ')}`);
console.log(`  indexing: ${indexable ? 'ENABLED (canonicals, sitemap, no noindex)' : 'disabled (noindex meta + X-Robots-Tag header)'}`);
if (mode === 'production') console.log(`  canonical base: ${origin}${basePath}\n  contact endpoint: ${endpoint || 'none'}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
