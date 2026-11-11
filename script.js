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


  /* ---------- Services submenu (computers; on phones the links sit open in the menu panel) ---------- */
  $$('.has-sub').forEach((item) => {
    const btn = $('.nav-sub-toggle', item);
    const panel = $('.nav-sub', item);
    if (!btn || !panel) return;
    let byHover = false, closeTimer = 0;
    const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
    const set = (open, { focusToggle = false } = {}) => {
      clearTimeout(closeTimer);
      btn.setAttribute('aria-expanded', String(open));
      item.classList.toggle('open', open);
      if (!open) { byHover = false; if (focusToggle) btn.focus(); }
    };
    btn.addEventListener('click', () => {
      if (isOpen() && byHover) { byHover = false; return; } // a click on a hover-opened menu keeps it open
      set(!isOpen());
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); set(true); $('a', panel).focus(); }
    });
    panel.addEventListener('keydown', (e) => {
      const links = $$('a', panel); const i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i > -1) { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === 'ArrowUp' && i > -1) { e.preventDefault(); i === 0 ? btn.focus() : links[i - 1].focus(); }
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopPropagation(); set(false, { focusToggle: true }); }
    });
    item.addEventListener('focusout', (e) => { if (isOpen() && e.relatedTarget && !item.contains(e.relatedTarget)) set(false); });
    document.addEventListener('pointerdown', (e) => { if (isOpen() && !item.contains(e.target)) set(false); });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || mobileMq.matches) return;
        clearTimeout(closeTimer);
        if (!isOpen()) { byHover = true; set(true); byHover = true; }
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse' || !byHover) return;
        closeTimer = setTimeout(() => set(false), 220);
      });
    }
    mobileMq.addEventListener('change', () => set(false));
  });

  /* ---------- project stories: tap or click to advance ----------
     Every scene is real HTML, so the content is readable without JavaScript and by search engines.
     With JavaScript the scenes stack in one stage (so the page height never jumps) and only one shows. */
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lightbox = (() => {
    let dlg = null;
    return (src, alt) => {
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.className = 'lightbox';
        dlg.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close larger image">×</button><img alt="">';
        document.body.appendChild(dlg);
        $('.lightbox-close', dlg).addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      }
      const img = $('img', dlg);
      img.src = src; img.alt = alt;
      dlg.showModal();
    };
  })();

  $$('[data-story]').forEach((story) => {
    const scenes = $$('.scene', story);
    const stage = $('.story-stage', story);
    if (scenes.length < 2) return;
    const name = $('.story-head h2', story).textContent.trim();
    let index = 0;

    // progress: compact, labelled, and every earlier or later scene can be revisited
    const progress = document.createElement('ol');
    progress.className = 'story-progress';
    progress.setAttribute('aria-label', `${name}: story scenes`);
    const dots = scenes.map((s, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="seg" aria-hidden="true"></span><span class="seg-label">${s.dataset.label}</span>`;
      b.setAttribute('aria-label', `${s.dataset.label} (scene ${i + 1} of ${scenes.length})`);
      b.addEventListener('click', () => go(i, { focus: 'none' }));
      li.appendChild(b); progress.appendChild(li);
      return b;
    });
    $('.story-head', story).appendChild(progress);

    // the continue control: a real button, styled as part of the scene
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'story-next';
    const live = document.createElement('p');
    live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
    const controls = document.createElement('div');
    controls.className = 'story-controls';
    controls.append(next, live);
    story.appendChild(controls);
    next.addEventListener('click', () => go(index + 1, { focus: 'next' }));

    // larger viewing for screenshots
    scenes.forEach((s) => {
      $$('.scene-media img', s).forEach((img) => {
        if (img.closest('.compare, .collage')) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'enlarge';
        b.setAttribute('aria-label', `View larger: ${img.alt.split(':')[0]}`);
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
        b.addEventListener('click', () => lightbox(img.currentSrc || img.src, img.alt));
        const phone = img.closest('.device-phone');
        if (phone) phone.appendChild(b); else (img.closest('picture') || img).insertAdjacentElement('afterend', b);
      });
    });

    // images in later scenes were set aside by an inline script so they don't compete with the first paint
    const restore = (scene) => {
      if (!scene) return;
      $$('[data-srcset], [data-src]', scene).forEach((el) => {
        ['srcset', 'src'].forEach((attr) => {
          const v = el.getAttribute('data-' + attr);
          if (v) { el.setAttribute(attr, v); el.removeAttribute('data-' + attr); }
        });
      });
    };
    const restoreAll = () => scenes.forEach(restore);
    if (document.readyState === 'complete') setTimeout(restoreAll, 200);
    else addEventListener('load', () => (window.requestIdleCallback ? requestIdleCallback(restoreAll, { timeout: 2500 }) : setTimeout(restoreAll, 600)), { once: true });

    const cueText = () => (index === 0 ? (coarse ? 'Tap to explore' : 'Click to explore') : (coarse ? 'Tap to continue' : 'Continue'));
    const render = (dir) => {
      restore(scenes[index]); restore(scenes[index + 1]);
      scenes.forEach((s, i) => {
        const on = i === index;
        s.classList.toggle('is-active', on);
        s.inert = !on;
        s.setAttribute('aria-hidden', String(!on));
        if (on) s.dataset.dir = dir;
      });
      dots.forEach((d, i) => {
        d.classList.toggle('is-done', i < index);
        if (i === index) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      const last = index === scenes.length - 1;
      next.hidden = last;
      next.innerHTML = `<span>${cueText()}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
      next.setAttribute('aria-label', last ? '' : `${cueText()}: ${scenes[index + 1].dataset.label}`);
      story.dataset.scene = String(index);
      story.classList.toggle('at-start', index === 0);
      $$('.story-replay', story).forEach((r) => { r.hidden = !last; });
      $$('.scene-media', story).forEach((m, i) => { m.dataset.cue = i === index && !last ? cueText() : ''; });
      document.dispatchEvent(new CustomEvent('story:change', { detail: { story } }));
    };
    const go = (i, { focus = 'none' } = {}) => {
      const target = Math.max(0, Math.min(scenes.length - 1, i));
      if (target === index) return;
      const dir = target > index ? 'fwd' : 'back';
      const hadFocus = story.contains(document.activeElement);
      index = target;
      render(dir);
      if (hadFocus && (!story.contains(document.activeElement) || document.activeElement.closest('[inert]') || document.activeElement.hidden)) focus = 'heading';
      live.textContent = `${scenes[index].dataset.label}, scene ${index + 1} of ${scenes.length}`;
      // keep focus somewhere sensible: on the continue button, or on the scene heading once it disappears
      if (focus === 'next') (next.hidden ? $('h3', scenes[index]) : next).focus({ preventScroll: true });
      if (focus === 'heading') $('h3', scenes[index]).focus({ preventScroll: true });
    };

    // tap or click the image area to advance; links, buttons, sliders, video and drags never advance
    let down = null;
    stage.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener('click', (e) => {
      const moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
      down = null;
      if (moved) return;
      if (!e.target.closest('.scene-media')) return;
      if (e.target.closest('a, button, input, select, textarea, label, video, audio, details, .compare')) return;
      if (String(getSelection && getSelection()).length) return;
      if (index < scenes.length - 1) go(index + 1, { focus: 'none' });
    });

    // keyboard: only while focus is inside this story, and never while a slider has focus
    story.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest('input, textarea, select, .compare')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, { focus: next.hidden ? 'heading' : 'keep' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1, { focus: 'keep' }); }
    });

    $$('.story-replay', story).forEach((r) => r.addEventListener('click', () => { go(0); next.focus({ preventScroll: true }); }));

    story.classList.add('is-ready');
    render('fwd');
  });

  /* ---------- before/after slider ----------
     Computers: drag (or use the arrow keys), with a one-off intro sweep.
     Phones: plays by itself, sweeping between the old site and the redesign while it's on screen.
     A swipe or tap takes over for a few seconds, and a pause button stops it for good. */
  const phoneMq = window.matchMedia('(max-width: 700px)');
  const autoplayWanted = () => phoneMq.matches && !reduceMotionMq.matches;

  $$('.compare').forEach((compare) => {
    const range = $('.compare-range', compare);
    let userTouched = false;
    let pos = 50;
    const setPos = (v) => {
      const n = Math.min(100, Math.max(0, Number(v)));
      pos = n;
      compare.style.setProperty('--pos', n.toFixed(1) + '%');
      range.value = Math.round(n);
      range.setAttribute('aria-valuetext', `${Math.round(n)}% previous website, ${100 - Math.round(n)}% redesign`);
    };
    const posFromEvent = (e) => {
      const r = compare.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    /* --- autoplay (phones) --- */
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // each step starts wherever the divider is now, so resuming after a swipe is seamless
    const steps = [{ to: 8, ms: 1700 }, { hold: 2000 }, { to: 92, ms: 1700 }, { hold: 1500 }];
    let auto = false, visible = false, stoppedByUser = false, resumeAt = 0;
    const shown = () => !compare.closest('[inert]');
    let stepIdx = 0, stepStart = 0, stepFrom = 50, raf = 0;

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'compare-play';
    playBtn.hidden = true;
    compare.appendChild(playBtn);
    const setBtn = () => {
      const paused = stoppedByUser;
      playBtn.setAttribute('aria-label', paused ? 'Play the before and after animation' : 'Pause the before and after animation');
      playBtn.innerHTML = paused
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    };

    const startStep = (i, now) => { stepIdx = i % steps.length; stepStart = now; stepFrom = pos; };
    const frame = (now) => {
      raf = 0;
      if (!auto || !visible || stoppedByUser || document.hidden || !shown()) return;
      if (now < resumeAt) { raf = requestAnimationFrame(frame); return; }
      if (resumeAt) { // coming back after a swipe: head for whichever end is further away
        resumeAt = 0;
        startStep(pos > 50 ? 0 : 2, now);
      }
      const s = steps[stepIdx];
      const t = Math.min(1, (now - stepStart) / (s.ms || s.hold));
      if (s.to !== undefined) setPos(stepFrom + (s.to - stepFrom) * ease(t));
      if (t >= 1) startStep(stepIdx + 1, now);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (raf || !auto || !visible || stoppedByUser || document.hidden || !shown()) return;
      stepStart = performance.now(); stepFrom = pos;
      raf = requestAnimationFrame(frame);
    };
    const holdForUser = () => { if (auto) resumeAt = performance.now() + 4000; };

    const applyMode = () => {
      auto = autoplayWanted();
      compare.classList.toggle('is-auto', auto);
      root.classList.toggle('compare-autoplay', auto);
      playBtn.hidden = !auto;
      setBtn();
      if (auto) { userTouched = true; startStep(0, performance.now()); kick(); }
    };
    playBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stoppedByUser = !stoppedByUser;
      resumeAt = 0;
      setBtn();
      if (!stoppedByUser) { startStep(pos > 50 ? 0 : 2, performance.now()); kick(); }
    });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: 0.35 }).observe(compare);
    document.addEventListener('visibilitychange', kick);
    phoneMq.addEventListener('change', applyMode);
    reduceMotionMq.addEventListener('change', applyMode);

    /* --- manual control (all screens) --- */
    range.addEventListener('input', () => { userTouched = true; holdForUser(); setPos(range.value); });

    // Mouse: press anywhere and drag. Touch: only a mostly-horizontal drag moves the slider,
    // so vertical swipes still scroll the page (the frame uses touch-action: pan-y).
    let drag = null;
    compare.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: e.pointerType === 'mouse' };
      if (drag.active) {
        e.preventDefault();
        userTouched = true;
        holdForUser();
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
      holdForUser();
      setPos(posFromEvent(e));
    });
    const endDrag = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      // a simple tap (no drag) on touch jumps the divider there
      if (!drag.active && e.type === 'pointerup') { userTouched = true; setPos(posFromEvent(e)); }
      if (e.type === 'pointerup') holdForUser();
      drag = null;
      compare.classList.remove('dragging');
    };
    compare.addEventListener('pointerup', endDrag);
    compare.addEventListener('pointercancel', endDrag);

    applyMode();

    // Computers: intro sweep shows the "after", then settles in the middle (once it is on screen and its scene is showing)
    let introDone = false, introInView = false;
    const maybeIntro = () => {
      if (introDone || userTouched || auto || reduceMotionMq.matches || !introInView || !shown()) return;
      introDone = true;
      const keys = [[0, 92], [900, 8], [1900, 50]];
      const start = performance.now() + 350;
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        if (userTouched || auto) return;
        const t = now - start;
        if (t < 0) return requestAnimationFrame(tick);
        let i = 0;
        while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
        const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
        const p = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
        setPos(v0 + (v1 - v0) * easeOut(p));
        if (t < keys[keys.length - 1][0]) requestAnimationFrame(tick);
      };
      setPos(92);
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([en]) => { introInView = en.isIntersecting; maybeIntro(); }, { threshold: 0.5 }).observe(compare);
    document.addEventListener('story:change', () => { kick(); maybeIntro(); });
  });

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
    const label = () => {
      const intent = ($('input[name="intent"]:checked', form) || {}).value || 'review';
      const l = $('.btn-label', form);
      return (l && l.dataset[intent === 'project' ? 'labelProject' : 'labelReview']) || 'Send my request';
    };
    const applyIntent = () => {
      const intent = ($('input[name="intent"]:checked', form) || {}).value || 'review';
      document.documentElement.dataset.intent = intent;
      if (!form.classList.contains('is-loading')) $('.btn-label', form).textContent = label();
    };
    const wanted = new URLSearchParams(location.search).get('intent');
    const pre = wanted && $(`input[name="intent"][value="${wanted === 'project' ? 'project' : 'review'}"]`, form);
    if (pre) pre.checked = true;
    form.addEventListener('change', (e) => { if (e.target.name === 'intent') applyIntent(); });
    applyIntent();
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
      $('.btn-label', submit).textContent = on ? 'Sending…' : label();
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
