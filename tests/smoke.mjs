#!/usr/bin/env node
// Browser smoke tests for the static site (needs Playwright + Chromium installed).
//   python3 -m http.server 8080        # from the repo root (or serve dist/)
//   BASE=http://localhost:8080/ node tests/smoke.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:8080/';
const PAGES = ['index.html', 'website-design.html', 'website-maintenance.html', 'work.html', 'contact.html', '404.html'];
const WIDTHS = [360, 390, 768, 1024, 1440];
let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; } else { failures++; console.log(`  ✖ ${msg}`); } };
const section = (t) => console.log(`\n▸ ${t}`);

const browser = await chromium.launch({ args: ['--touch-events=enabled'] });

// ---------- layout, console errors, missing resources, noindex ----------
section('Layout at each width (overflow, clipped headings, console errors, failed requests, noindex)');
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 860 } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', (r) => errs.push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errs.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    // reveal everything so measurements reflect final layout
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll('main *, footer *, header *')].filter((e) => {
        if (e.closest('.marquee, .compare, .nav-links, .hp, .skip-link, .sr-only')) return false;
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.right > vw + 1 || b.left < -1);
      }).map((e) => `${e.tagName.toLowerCase()}.${e.className}`).slice(0, 5);
      const clipped = [...document.querySelectorAll('h1, h2, h3, .btn, label')].filter((e) => e.scrollWidth > e.clientWidth + 2 && !e.closest('.hero-title, .sr-only'))
        .map((e) => e.textContent.trim().slice(0, 40));
      return {
        scrollW: document.documentElement.scrollWidth, vw, over, clipped,
        robots: document.querySelector('meta[name="robots"]')?.content,
        h1: document.querySelectorAll('h1').length,
      };
    });
    const tag = `${path} @${w}`;
    ok(r.scrollW <= r.vw, `${tag}: page scrolls horizontally (${r.scrollW} > ${r.vw})`);
    ok(r.over.length === 0, `${tag}: elements outside viewport: ${r.over.join(', ')}`);
    ok(r.clipped.length === 0, `${tag}: clipped text: ${r.clipped.join(' | ')}`);
    ok(errs.length === 0, `${tag}: console/network errors: ${errs.join(' | ')}`);
    ok(/noindex/.test(r.robots || ''), `${tag}: missing noindex meta`);
    ok(r.h1 === 1, `${tag}: expected one h1, found ${r.h1}`);
    await page.close();
  }
  await ctx.close();
}

// ---------- internal links ----------
section('Internal links and anchors');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const seen = new Set();
  for (const path of PAGES) {
    await page.goto(BASE + path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of hrefs) {
      if (/^(https?:|mailto:|tel:|sms:)/.test(h)) continue;
      const [file, hash] = h.split('#');
      const target = file || path;
      const key = `${target}#${hash || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const res = await ctx.request.get(BASE + target);
      ok(res.status() === 200, `${path}: link ${h} → HTTP ${res.status()}`);
      if (hash) {
        const html = await res.text();
        ok(html.includes(`id="${hash}"`), `${path}: link ${h} → anchor #${hash} not found`);
      }
    }
  }
  console.log(`  checked ${seen.size} unique internal links`);
  await ctx.close();
}

// ---------- mobile menu ----------
section('Mobile menu');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html');
  const state = () => page.evaluate(() => {
    const ul = document.querySelector('#nav-links');
    const cs = getComputedStyle(ul);
    return { expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'), visibility: cs.visibility,
      label: document.querySelector('.nav-toggle-text').textContent, overflow: getComputedStyle(document.body).overflow,
      active: document.activeElement?.textContent.trim().slice(0, 30), height: ul.getBoundingClientRect().height };
  });
  let s = await state();
  ok(s.expanded === 'false' && s.visibility === 'hidden', `closed menu should be hidden (got ${JSON.stringify(s)})`);
  // closed menu links must not receive focus
  const tabbed = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); tabbed.push(await page.evaluate(() => document.activeElement.textContent.trim().replace(/\s+/g, ' ').slice(0, 25))); }
  ok(!tabbed.some((t) => /Website design|Support|Our work|About/.test(t)), `closed menu links received focus: ${tabbed.join(' → ')}`);

  await page.click('.nav-toggle');
  await page.waitForTimeout(350);
  s = await state();
  ok(s.expanded === 'true' && s.visibility === 'visible' && s.label === 'Close', `open state out of sync: ${JSON.stringify(s)}`);
  ok(s.height < 844 * 0.6, `dropdown should be compact (height ${Math.round(s.height)}px)`);
  ok(s.overflow !== 'hidden', 'opening the menu should not lock page scroll');
  const firstLink = await page.$('#nav-links a');
  const box = await firstLink.boundingBox();
  ok(box.height >= 44, `menu touch target too small (${box.height}px)`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600); // closing transition is 300ms; leave headroom on a busy machine
  s = await state();
  ok(s.expanded === 'false' && s.visibility === 'hidden', 'Escape should close the menu');
  ok(/Menu/.test(s.active), `focus should return to the toggle after Escape (was on "${s.active}")`);

  await page.click('.nav-toggle'); await page.waitForTimeout(350);
  await page.mouse.click(200, 600); await page.waitForTimeout(350);
  s = await state();
  ok(s.expanded === 'false', 'tapping outside should close the menu');

  await page.click('.nav-toggle'); await page.waitForTimeout(350);
  await page.click('#nav-links a[href="index.html#about"]'); await page.waitForTimeout(900);
  s = await state();
  ok(s.expanded === 'false', 'choosing a link should close the menu');
  const headerOverlap = await page.evaluate(() => document.querySelector('#about-title').getBoundingClientRect().top - document.querySelector('.nav').getBoundingClientRect().bottom);
  ok(headerOverlap >= 0, `fixed header covers the anchor target by ${-headerOverlap}px`);

  await page.click('.nav-toggle'); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1024, height: 800 }); await page.waitForTimeout(300);
  s = await state();
  ok(s.expanded === 'false' && s.visibility === 'visible', `desktop width should reset the menu and show links (${JSON.stringify(s)})`);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
  s = await state();
  ok(s.expanded === 'false' && s.visibility === 'hidden', 'back on mobile the menu should be closed');
  await ctx.close();
}

// ---------- keyboard focus visibility ----------
section('Keyboard focus');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + 'index.html');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const skip = await page.evaluate(() => ({ text: document.activeElement.textContent, top: document.activeElement.getBoundingClientRect().top }));
  ok(/Skip to content/.test(skip.text) && skip.top >= 0, 'first Tab should reveal the skip link');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok(outline !== 'none', 'focused element should show an outline');
  await page.close();
}

// ---------- animations ----------
section('Animations and offscreen pausing');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + 'index.html');
  await page.waitForTimeout(1200);
  const names = await page.evaluate(() => [...new Set(document.getAnimations().map((a) => a.animationName).filter(Boolean))]);
  for (const n of ['breathe', 'flow', 'scroll', 'cue']) ok(names.includes(n), `animation "${n}" should be running (have ${names.join(', ')})`);
  const drawsPerSec = () => page.evaluate(() => new Promise((res) => {
    const ctx = document.querySelector('.embers').getContext('2d');
    let n = 0; const orig = ctx.clearRect;
    ctx.clearRect = function (...a) { n++; return orig.apply(this, a); };
    setTimeout(() => { ctx.clearRect = orig; res(n); }, 1000);
  }));
  const lit = await page.evaluate(() => {
    const c = document.querySelector('.embers'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 50) if (d[i] > 0) n++; return n;
  });
  ok(lit > 0, 'ember canvas should be drawing particles');
  ok(await drawsPerSec() > 20, 'ember animation should run while the hero is visible');
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 2600); });
  await page.waitForTimeout(400);
  ok(await drawsPerSec() === 0, 'ember animation should pause when the hero is offscreen');
  ok(await page.evaluate(() => document.querySelector('.hero').classList.contains('is-paused')), 'hero CSS animation should pause offscreen');

  // compare intro sweep
  await page.evaluate(() => document.querySelector('.compare').scrollIntoView({ block: 'center' }));
  const p1 = await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos'));
  await page.waitForTimeout(1300);
  const p2 = await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos'));
  ok(p1 !== p2, `comparison intro sweep should animate (${p1} → ${p2})`);
  await page.waitForTimeout(1500);

  // mouse drag
  const box = await (await page.$('.compare')).boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 }); await page.mouse.up();
  const dragged = parseFloat(await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos')));
  ok(Math.abs(dragged - 20) < 3, `mouse drag should move the divider to ~20% (got ${dragged})`);
  // keyboard
  await page.focus('#compare-range');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  const keyed = parseFloat(await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos')));
  ok(keyed > dragged, `arrow keys should move the divider (${dragged} → ${keyed})`);
  await page.close();
}

// ---------- touch: vertical swipes on the slider scroll the page ----------
section('Touch scrolling over the comparison slider');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html');
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('.compare').scrollIntoView({ block: 'center' }); });
  const getPos = () => page.evaluate(() => parseFloat(document.querySelector('.compare').style.getPropertyValue('--pos')));
  ok(await page.evaluate(() => document.querySelector('.compare').classList.contains('is-auto')), 'phone slider should be in autoplay mode');
  const a0 = await getPos(); await page.waitForTimeout(1200); const a1 = await getPos();
  ok(Math.abs(a1 - a0) > 5, `phone slider should play by itself (${a0} → ${a1})`);
  const fr = await (await page.$('.compare')).boundingBox();
  ok(fr.height <= 844 * 0.72 + 1 && fr.height < fr.width * 1.7, `phone slider frame should fit on screen (${Math.round(fr.width)}×${Math.round(fr.height)})`);
  const box = await (await page.$('.compare')).boundingBox();
  const before = await page.evaluate(() => ({ y: scrollY, pos: document.querySelector('.compare').style.getPropertyValue('--pos') }));
  const cdp = await ctx.newCDPSession(page);
  const swipe = async (x0, y0, x1, y1) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * i / 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  };
  const cy = Math.round(box.y + box.height / 2);
  await swipe(200, cy + 100, 205, cy - 150);
  const after = await page.evaluate(() => ({ y: scrollY, pos: document.querySelector('.compare').style.getPropertyValue('--pos') }));
  ok(after.y > before.y + 100, `vertical swipe on the slider should scroll the page (${before.y} → ${after.y})`);
  // re-centre the slider so the horizontal swipe lands on it, not on the fixed header
  await page.evaluate(() => document.querySelector('.compare').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  const box2 = await (await page.$('.compare')).boundingBox();
  const cy2 = Math.round(Math.max(box2.y, 120) + Math.min(box2.height, 844 - 120) / 2);
  await swipe(300, cy2, 80, cy2 + 5);
  const swiped = parseFloat(await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos')));
  const fingerPos = ((80 - box2.x) / box2.width) * 100;
  ok(Math.abs(swiped - fingerPos) < 6, `horizontal swipe should move the divider to the finger (~${Math.round(fingerPos)} → ${swiped})`);
  await page.waitForTimeout(1500);
  ok(Math.abs(await getPos() - swiped) < 1, 'autoplay should wait after a swipe instead of fighting the finger');
  await page.click('.compare-play'); const p0 = await getPos(); await page.waitForTimeout(5500);
  ok(Math.abs(await getPos() - p0) < 1, 'pause button should stop the autoplay');
  await ctx.close();
}

// ---------- reduced motion ----------
section('Reduced motion');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    embers: getComputedStyle(document.querySelector('.embers')).display,
    hidden: [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length,
    running: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length,
  }));
  ok(r.embers === 'none', 'ember canvas should be hidden with reduced motion');
  ok(r.hidden === 0, `${r.hidden} reveal elements stay invisible with reduced motion`);
  ok(r.running === 0, `${r.running} infinite animations still running with reduced motion`);
  await ctx.close();
}

// ---------- contact form ----------
section('Contact form');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let posted = 0;
  await page.route('**/*', (route) => { if (route.request().method() === 'POST') posted++; route.continue(); });
  await page.goto(BASE + 'contact.html');
  await page.click('button[type="submit"]');
  let r = await page.evaluate(() => ({
    invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.name),
    nameErr: document.querySelector('#f-name-error').textContent, active: document.activeElement.name,
    status: document.querySelector('.form-status').textContent,
  }));
  ok(r.invalid.join() === 'name,email', `empty submit should flag name and email (got ${r.invalid})`);
  ok(r.active === 'name', 'focus should move to the first invalid field');
  ok(/fix the 2/.test(r.status), `status should summarise errors ("${r.status}")`);
  await page.fill('#f-name', 'Test Person');
  await page.fill('#f-email', 'not-an-email');
  await page.fill('#f-website', 'not a url');
  await page.click('button[type="submit"]');
  r = await page.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.name));
  ok(r.join() === 'email,website', `invalid email/website should be flagged (got ${r})`);
  await page.fill('#f-email', 'test@example.com');
  await page.fill('#f-website', 'example.com');
  await page.click('button[type="submit"]');
  const status = await page.textContent('.form-status');
  ok(/nothing was sent/i.test(status) && !/received/i.test(status), `preview mode must say nothing was sent ("${status}")`);
  ok(posted === 0, 'preview mode must not send any request');

  // regression: with a bad value typed, tapping Send must submit (no layout shift swallowing the tap)
  {
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mp = await mctx.newPage();
    await mp.goto(BASE + 'contact.html');
    await mp.fill('#f-email', 'jane@');
    await mp.tap('button[type="submit"]');
    await mp.waitForTimeout(300);
    const t = await mp.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.name).join());
    ok(t === 'name,email', `tapping Send after typing a bad email should validate the whole form (got "${t}")`);
    await mctx.close();
  }

  // simulate a configured endpoint
  const scenario = async (handler) => {
    await page.goto(BASE + 'contact.html');
    await page.evaluate(() => { document.querySelector('#contact-form').dataset.endpoint = 'https://forms.invalid/submit'; });
    await page.unroute('https://forms.invalid/submit').catch(() => {});
    await page.route('https://forms.invalid/submit', handler);
    await page.fill('#f-name', 'Test Person'); await page.fill('#f-email', 'test@example.com');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);
    return page.evaluate(() => ({ success: !!document.querySelector('.form-success'), status: document.querySelector('.form-status')?.textContent || '', name: document.querySelector('#f-name')?.value }));
  };
  r = await scenario((route) => setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), 300));
  ok(r.success, 'accepted submission should show the success message');
  r = await scenario((route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"errors":[{"message":"Server error"}]}' }));
  ok(!r.success && /wasn’t accepted/.test(r.status) && r.name === 'Test Person', `server error must not show success and must keep input (${JSON.stringify(r)})`);
  r = await scenario((route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>ok</html>' }));
  ok(!r.success, 'a 200 without an explicit {ok:true} must not count as success');
  r = await scenario((route) => route.abort('failed'));
  ok(!r.success && /not sent/.test(r.status), `network failure must say it was not sent ("${r.status}")`);
  // loading state
  await page.goto(BASE + 'contact.html');
  await page.evaluate(() => { document.querySelector('#contact-form').dataset.endpoint = 'https://forms.invalid/slow'; });
  await page.route('https://forms.invalid/slow', (route) => setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), 1500));
  await page.fill('#f-name', 'Test Person'); await page.fill('#f-email', 'test@example.com');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(200);
  const loading = await page.evaluate(() => ({ disabled: document.querySelector('button[type="submit"]').disabled, label: document.querySelector('.btn-label').textContent, busy: document.querySelector('#contact-form').getAttribute('aria-busy') }));
  ok(loading.disabled && /Sending/.test(loading.label) && loading.busy === 'true', `loading state not shown (${JSON.stringify(loading)})`);
  await page.close();
}

// ---------- predictable navigation ----------
section('Navigation: page tops, section anchors, Back/Forward, logo');
for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 500 });
  const page = await ctx.newPage();
  const tag = `@${vp.width}`;
  const settle = async () => { await page.waitForLoadState('load'); await page.waitForTimeout(700); };
  const pos = () => page.evaluate(() => ({
    path: location.pathname.split('/').pop() + location.hash, y: Math.round(scrollY),
    h1: Math.round(document.querySelector('h1').getBoundingClientRect().top),
    header: Math.round(document.querySelector('.nav').getBoundingClientRect().bottom),
  }));
  const clickNav = async (selector) => {
    if (vp.width < 821 && selector.startsWith('header')) { await page.click('.nav-toggle'); await page.waitForTimeout(350); }
    await page.click(selector);
    await settle();
  };

  // every ordinary page link opens at the top with the heading visible below the header
  await page.goto(BASE + 'index.html'); await settle();
  for (const target of ['website-design.html', 'website-maintenance.html', 'work.html', 'contact.html']) {
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2)); await page.waitForTimeout(150);
    await page.click(`footer a[href="${target}"]`); await settle();
    const p = await pos();
    ok(p.path === target && p.y === 0, `${tag} footer link to ${target} should open at the top (got ${p.path} y=${p.y})`);
    ok(p.h1 >= p.header && p.h1 < vp.height * 0.6, `${tag} ${target} heading should be visible below the header (h1 top ${p.h1}, header ${p.header})`);
    const current = await page.evaluate((t) => [...document.querySelectorAll('#nav-links a[aria-current="page"]')].map((a) => a.getAttribute('href')).join(), target);
    ok(current === target, `${tag} ${target} should be marked as the current page in the nav (got "${current}")`);
  }

  // section link from another page lands on the section, clear of the fixed header
  await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(100);
  await clickNav('header a[href="index.html#about"]');
  let gap = await page.evaluate(() => Math.round(document.querySelector('#about-title').getBoundingClientRect().top - document.querySelector('.nav').getBoundingClientRect().bottom));
  ok(gap >= 8 && gap <= 120, `${tag} About link should land with the heading just below the header (gap ${gap}px)`);
  const aboutY = await page.evaluate(() => Math.round(scrollY));

  // Back returns to the previous page and position; Forward returns to the section
  await page.goBack(); await settle();
  let p = await pos();
  ok(p.path === 'contact.html' && Math.abs(p.y - 400) < 40, `${tag} Back should restore contact.html at its previous position (got ${p.path} y=${p.y})`);
  await page.goForward(); await settle();
  p = await pos();
  ok(p.path === 'index.html#about' && Math.abs(p.y - aboutY) < 40, `${tag} Forward should restore the About section (got ${p.path} y=${p.y}, expected ~${aboutY})`);

  // same-page section link (smooth) lands correctly
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(100);
  await page.click('a.scroll-cue'); await page.waitForTimeout(1200);
  gap = await page.evaluate(() => Math.round(document.querySelector('#services-title').getBoundingClientRect().top - document.querySelector('.nav').getBoundingClientRect().bottom));
  ok(gap >= 8 && gap <= 140, `${tag} in-page link should land on "What we do" below the header (gap ${gap}px)`);

  // the logo always returns to the homepage at the top
  await page.goto(BASE + 'work.html'); await settle();
  await page.evaluate(() => scrollTo(0, 900)); await page.waitForTimeout(100);
  await page.click('header .logo'); await settle();
  p = await pos();
  ok(p.path === 'index.html' && p.y === 0, `${tag} logo should open the homepage at the top (got ${p.path} y=${p.y})`);
  await page.evaluate(() => scrollTo(0, 1500)); await page.waitForTimeout(100);
  await page.click('header .logo'); await settle();
  p = await pos();
  ok(p.y === 0, `${tag} logo on the homepage should return to the top (y=${p.y})`);

  // mobile menu link closes the menu after navigation, scrolling stays free
  if (vp.width < 821) {
    await clickNav('header a[href="work.html"]');
    const m = await page.evaluate(() => ({ exp: document.querySelector('.nav-toggle').getAttribute('aria-expanded'), ov: getComputedStyle(document.body).overflow, y: scrollY }));
    ok(m.exp === 'false' && m.ov !== 'hidden' && m.y === 0, `${tag} menu navigation should land at the top with the menu closed (${JSON.stringify(m)})`);
  }
  await ctx.close();
}

// ---------- short landscape screens ----------
section('Short landscape viewports');
for (const vp of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html'); await page.waitForTimeout(500);
  const tag = `${vp.width}x${vp.height}`;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(sw <= 0, `${tag} horizontal overflow ${sw}px`);
  const mobile = await page.evaluate(() => getComputedStyle(document.querySelector('.nav-toggle')).display !== 'none');
  if (mobile) {
    await page.tap('.nav-toggle'); await page.waitForTimeout(400);
    const links = await page.$$('#nav-links a');
    for (const a of links) {
      const box = await a.boundingBox();
      ok(box && box.y >= 0 && box.y + box.height <= vp.height, `${tag} menu link "${(await a.textContent()).trim()}" should be visible without scrolling the menu`);
    }
    await page.tap('.nav-toggle'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'), `${tag} scroll must not stay locked`);
  } else {
    // desktop nav: items must not overlap each other or the logo
    const boxes = await page.$$eval('.logo, #nav-links > li', (els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.right, r.top, r.bottom]));
    let overlap = false;
    for (let i = 1; i < boxes.length; i++) if (boxes[i][0] < boxes[i - 1][1] - 1 && boxes[i][2] < boxes[i - 1][3]) overlap = true;
    ok(!overlap, `${tag} desktop nav items overlap`);
  }
  await ctx.close();
}

// ---------- readable without JavaScript ----------
section('Content without JavaScript');
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(BASE + path); await page.waitForTimeout(3000);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('h1, h2, .lede, .scard, .step, .work-feature')].filter((e) => getComputedStyle(e).opacity === '0').length);
    ok(hidden === 0, `${path}: ${hidden} content blocks invisible without JavaScript`);
  }
  await ctx.close();
}
{
  // script.js failing to load must not leave content hidden
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.route('**/script.js', (r) => r.abort());
  await page.goto(BASE + 'index.html'); await page.waitForTimeout(3000);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length);
  ok(hidden === 0, `if script.js fails, ${hidden} reveal blocks stay hidden`);
  await ctx.close();
}

// ---------- stable buttons, no review notes in the design ----------
section('Button stability and customer-facing content');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + 'index.html'); await page.waitForTimeout(1500);
  for (const sel of ['.hero-cta .btn-primary', '.hero-cta .btn-ghost']) {
    const el = await page.$(sel);
    const before = await el.boundingBox();
    for (const [fx, fy] of [[0.05, 0.1], [0.95, 0.9], [0.5, 0.5]]) {
      await page.mouse.move(before.x + before.width * fx, before.y + before.height * fy, { steps: 3 });
      await page.waitForTimeout(80);
      const now = await el.boundingBox();
      const inside = before.x + before.width * fx >= now.x && before.x + before.width * fx <= now.x + now.width && before.y + before.height * fy >= now.y && before.y + before.height * fy <= now.y + now.height;
      ok(inside, `${sel}: pointer at (${fx},${fy}) slipped off the button`);
    }
    ok(before.height >= 44, `${sel}: button height ${before.height} < 44`);
  }
  for (const path of PAGES) {
    await page.goto(BASE + path);
    const notes = await page.evaluate(() => document.querySelectorAll('[data-confirm], .confirm-tag, .confirm-block, .preview-pill').length);
    ok(notes === 0, `${path}: internal approval notes visible in the design`);
    const deadLinks = await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length);
    ok(deadLinks === 0, `${path}: ${deadLinks} links without a real destination`);
  }
  // first paint of subpage headings shouldn't wait on scroll observers
  await page.goto(BASE + 'work.html'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('h1')).opacity === '1'), 'subpage heading should be fully shown shortly after load');
  await page.close();
}

// ---------- layout shift ----------
section('Layout shift during load');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
    await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => window.__cls);
    ok(cls < 0.05, `${path}: cumulative layout shift ${cls.toFixed(3)}`);
    await page.close();
  }
  await ctx.close();
}

// ---------- real before/after comparison ----------
section('Impressive Finishes comparison (home + Our work, desktop + phone)');
for (const [vp, mobile] of [[{ width: 1440, height: 900 }, false], [{ width: 390, height: 844 }, true]]) {
  for (const path of ['index.html', 'work.html']) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
    const page = await ctx.newPage();
    const tag = `${path} @${vp.width}`;
    await page.goto(BASE + path);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('.compare').scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(3600);
    const info = await page.evaluate(() => [...document.querySelectorAll('.compare-shots img')].map((i) => ({
      src: i.currentSrc.split('/').pop(), ok: i.complete && i.naturalWidth > 0, alt: i.alt.length,
      w: i.getAttribute('width'), h: i.getAttribute('height'),
      box: i.getBoundingClientRect().toJSON(),
    })));
    ok(info.length === 2, `${tag}: expected 2 screenshots, found ${info.length}`);
    for (const i of info) {
      ok(i.ok, `${tag}: screenshot ${i.src} did not load`);
      ok(i.alt > 40 && i.w && i.h, `${tag}: screenshot ${i.src} needs a description and explicit size`);
      ok(mobile ? /mobile/.test(i.src) : /desktop/.test(i.src), `${tag}: wrong capture for this screen (${i.src})`);
    }
    if (info.length === 2) {
      const [a, b] = info.map((i) => i.box);
      ok(Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1, `${tag}: before and after are not aligned in the same frame`);
    }
    const text = await page.evaluate(() => document.querySelector('main').innerText);
    ok(!/Riverside|concept demo|fictional|made-up/i.test(text), `${tag}: fictional demo wording still present`);
    ok(/before/i.test(await page.textContent('.tag-before')) && /after/i.test(await page.textContent('.tag-after')), `${tag}: before/after labels missing`);
    // drag + keyboard on this page's slider
    const box = await (await page.$('.compare')).boundingBox();
    if (!mobile) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
      await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
      const pos = parseFloat(await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos')));
      ok(Math.abs(pos - 30) < 3, `${tag}: drag should move the divider to ~30% (got ${pos})`);
      await page.focus('.compare-range'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
      const keyed = parseFloat(await page.evaluate(() => document.querySelector('.compare').style.getPropertyValue('--pos')));
      ok(keyed < pos, `${tag}: arrow keys should move the divider (${pos} → ${keyed})`);
    }
    await ctx.close();
  }
}

// ---------- design evolution: reveals, journey, service rows ----------
section('Reveals, journey line and service rows');
for (const rm of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: rm });
  const page = await ctx.newPage();
  await page.goto(BASE + 'index.html'); await page.waitForTimeout(600);
  for (let y = 0; y < 8000; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(100); }
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    stuck: [...document.querySelectorAll('main h2.reveal')].filter((h) => !h.classList.contains('in')).map((h) => h.textContent.slice(0, 30)),
    masked: [...document.querySelectorAll('main h2')].filter((h) => getComputedStyle(h).maskImage !== 'none' && !h.classList.contains('in')).length,
    fill: parseFloat(getComputedStyle(document.querySelector('.journey-steps')).getPropertyValue('--fill')),
    lit: document.querySelectorAll('.journey-steps .step.lit').length,
    numbered: [...document.querySelectorAll('.step-dot')].some((d) => getComputedStyle(d, '::before').content.match(/\d/)),
  }));
  ok(r.stuck.length === 0, `${rm}: headings never revealed after scrolling: ${r.stuck.join(' | ')}`);
  ok(r.masked === 0, `${rm}: ${r.masked} headings still masked`);
  ok(r.fill > 0.95 && r.lit === 4, `${rm}: journey line should be fully drawn after scrolling past (fill ${r.fill}, lit ${r.lit})`);
  ok(!r.numbered, `${rm}: journey dots should not show numbers`);
  if (rm === 'no-preference') {
    // a whole service row is clickable
    await page.evaluate(() => { document.documentElement.classList.remove('smooth-scroll'); document.querySelector('.offer').scrollIntoView({ block: 'center', behavior: 'instant' }); });
    await page.waitForTimeout(500);
    const box = await (await page.$('.offer')).boundingBox();
    await Promise.all([page.waitForURL(/website-design\.html/, { timeout: 5000 }).catch(() => {}), page.mouse.click(box.x + 30, box.y + box.height / 2)]);
    ok(/website-design\.html$/.test(page.url()), `clicking a service row should open its page (at ${page.url()})`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${failures ? '✖' : '✔'} ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
