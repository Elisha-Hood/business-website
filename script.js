(() => {
  const reduceMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  window.siteReady = true;
  const root = document.documentElement;

  /* ---------- predictable landing position ----------
     New page loads open at the top (browser default); links with a #section land on that section
     below the fixed header; Back/Forward and reload keep the browser's own restored position. */
  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const navType = navEntry ? navEntry.type : 'navigate';
  const landOnHash = () => {
    if (!location.hash) return;
    let target = null;
    try { target = document.querySelector(decodeURIComponent(location.hash)); } catch { /* invalid selector */ }
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  if (navType === 'navigate') {
    if (location.hash) {
      // re-align once fonts and late layout have settled, so the heading isn't left under the header
      addEventListener('load', landOnHash, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(landOnHash));
    } else if (window.top !== window) {
      // When this page is shown inside a frame (e.g. a review preview), bring its top into view on a new page.
      try { root.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch { /* ignore */ }
    }
  }
  // Smooth scrolling only for in-page jumps after load, never for the initial landing or history restores.
  addEventListener('load', () => {
    if (!reduceMotionMq.matches) requestAnimationFrame(() => root.classList.add('smooth-scroll'));
  }, { once: true });

  /* ---------- year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- pause decorative CSS animation when the tab is hidden ---------- */
  const onVisibility = () => document.documentElement.classList.toggle('tab-hidden', document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  // ...and while a decorated block is offscreen
  const pauseIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-paused', !en.isIntersecting));
  }, { rootMargin: '100px 0px' });
  $$('.hero, .page-hero, .marquee, .compare').forEach((el) => pauseIO.observe(el));

  /* ---------- nav: scrolled state + progress bar + process line (rAF-throttled) ---------- */
  const nav = $('.nav');
  const progress = $('.progress');
  const steps = $('.steps');
  const stepItems = $$('.step');
  let scrollQueued = false;

  const update = () => {
    scrollQueued = false;
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (steps) {
      // process timeline fills as you scroll through it
      const r = steps.getBoundingClientRect();
      const fill = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.2)));
      steps.style.setProperty('--fill', fill.toFixed(3));
      stepItems.forEach((s, i) => s.classList.toggle('lit', fill >= i / stepItems.length + 0.02 || (innerWidth <= 960 && s.classList.contains('in'))));
    }
  };
  const onScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  /* ---------- mobile menu: compact dropdown ---------- */
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  const toggleText = $('.nav-toggle-text');
  const mobileMq = window.matchMedia('(max-width: 820px)');

  const setMenu = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (toggleText) toggleText.textContent = open ? 'Close' : 'Menu';
    links.classList.toggle('open', open);
    nav.classList.toggle('menu-open', open);
    // Closed dropdown is hidden with visibility (not focusable); inert is a second guard where supported.
    links.inert = mobileMq.matches && !open;
    if (!open && returnFocus) toggle.focus();
  };
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  if (toggle && links) {
    setMenu(false);
    toggle.addEventListener('click', () => setMenu(!isOpen()));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); setMenu(false, { returnFocus: true }); }
    });
    // tap or click outside closes it
    document.addEventListener('pointerdown', (e) => { if (isOpen() && !nav.contains(e.target)) setMenu(false); });
    // tabbing out of the header closes it
    nav.addEventListener('focusout', (e) => { if (isOpen() && e.relatedTarget && !nav.contains(e.relatedTarget)) setMenu(false); });
    // switching between mobile and desktop width resets the menu, without animating the switch
    // returning via Back/Forward from the page cache must never show a stale open menu
    addEventListener('pageshow', (e) => { if (e.persisted) setMenu(false); });
    addEventListener('hashchange', () => setMenu(false));
    mobileMq.addEventListener('change', () => {
      nav.classList.add('no-anim');
      setMenu(false);
      requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove('no-anim')));
    });
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
        onScroll();
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => { if (!el.closest('.hero, .page-hero')) io.observe(el); });

  /* ---------- before/after slider ---------- */
  const compare = $('.compare');
  if (compare) {
    const range = $('.compare-range', compare);
    let userTouched = false;
    const setPos = (v) => {
      const n = Math.min(100, Math.max(0, Number(v)));
      compare.style.setProperty('--pos', n + '%');
      range.value = Math.round(n);
      range.setAttribute('aria-valuetext', `${Math.round(n)}% of the before version shown`);
    };
    const posFromEvent = (e) => {
      const r = compare.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    range.addEventListener('input', () => { userTouched = true; setPos(range.value); });

    // Mouse: press anywhere and drag. Touch: only a mostly-horizontal drag moves the slider,
    // so vertical swipes still scroll the page (the frame uses touch-action: pan-y).
    let drag = null;
    compare.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: e.pointerType === 'mouse' };
      if (drag.active) {
        e.preventDefault();
        userTouched = true;
        compare.setPointerCapture(e.pointerId);
        compare.classList.add('dragging');
        setPos(posFromEvent(e));
      }
    });
    compare.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.active) {
        const dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { drag = null; return; }
        drag.active = true;
        userTouched = true;
        compare.setPointerCapture(e.pointerId);
        compare.classList.add('dragging');
      }
      setPos(posFromEvent(e));
    });
    const endDrag = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      // a simple tap (no drag) on touch jumps the divider there
      if (!drag.active && e.type === 'pointerup') { userTouched = true; setPos(posFromEvent(e)); }
      drag = null;
      compare.classList.remove('dragging');
    };
    compare.addEventListener('pointerup', endDrag);
    compare.addEventListener('pointercancel', endDrag);

    // Intro sweep: show the "after", then settle in the middle
    if (!reduceMotionMq.matches) {
      const introIO = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        introIO.disconnect();
        const keys = [[0, 92], [900, 8], [1900, 50]];
        const start = performance.now() + 500;
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const tick = (now) => {
          if (userTouched) return;
          const t = now - start;
          if (t < 0) return requestAnimationFrame(tick);
          let i = 0;
          while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
          const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
          const p = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
          setPos((v0 + (v1 - v0) * ease(p)).toFixed(1));
          if (t < keys[keys.length - 1][0]) requestAnimationFrame(tick);
        };
        setPos(92);
        requestAnimationFrame(tick);
      }, { threshold: 0.5 });
      introIO.observe(compare);
    }
  }

  /* ---------- card spotlight follows cursor ---------- */
  $$('.glow').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- magnetic buttons ---------- */
  if (!reduceMotionMq.matches && matchMedia('(hover: hover)').matches) {
    // a gentle pull, capped so the button never slides out from under the pointer
    const cap = (v, m) => Math.max(-m, Math.min(m, v));
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        if (e.buttons) return;
        const x = cap((e.clientX - r.left - r.width / 2) * 0.12, 6);
        const y = cap((e.clientY - r.top - r.height / 2) * 0.2, 4);
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- ember particles in hero ---------- */
  const canvas = $('.embers');
  if (canvas && !reduceMotionMq.matches) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;
    let w = 0, h = 0, dpr = 1, particles = [];
    let onScreen = true, rafId = 0;

    // Pre-render the glow once (same colour stops as before) instead of building a gradient per particle per frame.
    const SPRITE = 64;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = SPRITE;
    {
      const s = sprite.getContext('2d');
      const g = s.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
      g.addColorStop(0, 'rgba(255, 200, 120, 0.9)');
      g.addColorStop(0.3, 'rgba(255, 110, 30, 0.5)');
      g.addColorStop(1, 'rgba(255, 80, 20, 0)');
      s.fillStyle = g;
      s.fillRect(0, 0, SPRITE, SPRITE);
    }

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + 0.6,
      vy: Math.random() * 0.6 + 0.25,
      drift: Math.random() * 0.6 - 0.3,
      phase: Math.random() * Math.PI * 2,
      life: Math.random() * 0.5 + 0.5,
    });
    const resize = () => {
      const nw = hero.clientWidth, nh = hero.clientHeight;
      // lighter canvas on small screens: the glow is soft, so 1.5x looks the same and costs less
      const ndpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
      if (nw === w && nh === h && ndpr === dpr) return;
      const sx = w ? nw / w : 1, sy = h ? nh / h : 1;
      w = nw; h = nh; dpr = ndpr;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, w / 14));
      // keep existing embers (rescaled) so a phone's address bar showing/hiding doesn't reset them
      particles = particles.slice(0, count).map((p) => ({ ...p, x: p.x * sx, y: p.y * sy }));
      while (particles.length < count) particles.push(spawn(true));
    };
    const draw = (t) => {
      rafId = 0;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.drift + Math.sin(t / 900 + p.phase) * 0.3;
        if (p.y < -10) Object.assign(p, spawn(false));
        const fade = Math.max(0, Math.min(1, p.y / h)) * p.life;
        if (fade <= 0) continue;
        const size = p.r * 10;
        ctx.globalAlpha = fade;
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      schedule();
    };
    const schedule = () => {
      if (!rafId && onScreen && !document.hidden) rafId = requestAnimationFrame(draw);
    };
    const stop = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

    // pause when the hero is offscreen or the tab is hidden, to save battery
    new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting;
      onScreen ? schedule() : stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : schedule()));

    let resizeTimer = 0;
    addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
    resize();
    schedule();
  }

  /* ---------- contact form ---------- */
  // Delivery is only attempted when the build sets data-endpoint (see site.config.json).
  // Without it the form runs in a clearly labelled preview mode and never claims anything was sent.
  const form = $('#contact-form');
  if (form) {
    const status = $('.form-status', form);
    const submit = $('button[type="submit"]', form);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

    const rules = {
      name: (v) => (!v ? 'Please enter your name.' : v.length > 100 ? 'Please keep your name under 100 characters.' : ''),
      email: (v) => (!v ? 'Please enter your email address so we can reply.' : !EMAIL_RE.test(v) ? 'That email address doesn’t look complete. Please check it.' : ''),
      business: (v) => (v.length > 120 ? 'Please keep this under 120 characters.' : ''),
      website: (v) => (v && !URL_RE.test(v) ? 'Please enter a web address like yourbusiness.com, or leave it blank.' : ''),
      message: (v) => (v.length > 2000 ? `Please shorten this to 2,000 characters (currently ${v.length}).` : ''),
    };

    const showError = (field, msg) => {
      const err = $(`#${field.id}-error`);
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
    };
    const validateField = (field) => {
      const rule = rules[field.name];
      if (!rule) return '';
      const msg = rule(field.value.trim());
      showError(field, msg);
      return msg;
    };
    const setStatus = (msg, kind) => {
      status.textContent = msg;
      status.className = `form-status full${kind ? ' is-' + kind : ''}`;
    };
    const setLoading = (on) => {
      submit.disabled = on;
      form.classList.toggle('is-loading', on);
      form.setAttribute('aria-busy', String(on));
      $('.btn-label', submit).textContent = on ? 'Sending…' : 'Send my request';
    };

    // re-check a field as soon as the visitor fixes it
    form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    // (No validation on blur: an error appearing as you tap "Send" would shift the button and swallow the tap.)

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.classList.contains('is-loading')) return;
      const fields = $$('input, textarea', form).filter((f) => rules[f.name]);
      const invalid = fields.filter((f) => validateField(f));
      if (invalid.length) {
        setStatus(invalid.length === 1 ? 'Please fix the highlighted field.' : `Please fix the ${invalid.length} highlighted fields.`, 'error');
        invalid[0].focus();
        return;
      }

      // spam trap: real visitors never see or fill this field
      if ($('.hp input', form).value) { setStatus('', ''); return; }

      const endpoint = (form.dataset.endpoint || '').trim();
      if (!endpoint) {
        setStatus('Your entries look good, but this form isn’t connected to an inbox yet, so nothing was sent.', 'info');
        return;
      }

      setLoading(true);
      setStatus('Sending your request…', '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
          signal: controller.signal,
        });
        let data = null;
        try { data = await res.json(); } catch { /* non-JSON reply counts as failure */ }
        // Only report success when the service explicitly accepted the request.
        if (res.ok && data && data.ok === true) {
          const done = document.createElement('div');
          done.className = 'form-success';
          done.setAttribute('tabindex', '-1');
          done.innerHTML = '<h2>Thanks, your request was received.</h2><p>We’ll reply to the email address you gave us. If you don’t see a reply, please check your spam folder.</p>';
          form.replaceChildren(done);
          done.focus();
          return;
        }
        const detail = data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message;
        setStatus(`Sorry, your request wasn’t accepted${detail ? ` (${detail})` : ''}. Your details are still here, so you can try again.`, 'error');
      } catch (err) {
        setStatus(err.name === 'AbortError'
          ? 'This is taking too long and we couldn’t confirm your request was received. Please try again in a moment.'
          : 'We couldn’t reach the form service, so your request was not sent. Please check your connection and try again.', 'error');
      } finally {
        clearTimeout(timer);
        if (form.isConnected && $('button', form)) setLoading(false);
      }
    });
  }
})();
