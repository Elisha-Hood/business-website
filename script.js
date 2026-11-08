(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- year ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + progress bar + process line ---------- */
  const nav = $('.nav');
  const progress = $('.progress');
  const steps = $('.steps');
  const stepItems = $$('.step');

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // process timeline fills as you scroll through it
    const r = steps.getBoundingClientRect();
    const fill = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.2)));
    steps.style.setProperty('--fill', fill.toFixed(3));
    stepItems.forEach((s, i) => s.classList.toggle('lit', fill >= i / stepItems.length + 0.02 || (innerWidth <= 960 && s.classList.contains('in'))));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- mobile menu ---------- */
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', open);
    links.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

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
  $$('.reveal').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

  /* ---------- before/after slider ---------- */
  const compare = $('.compare');
  const range = $('.compare-range');
  const setPos = (v) => { compare.style.setProperty('--pos', v + '%'); range.value = v; };
  range.addEventListener('input', () => { userTouched = true; setPos(range.value); });

  let userTouched = false;
  // Let users drag anywhere on touch devices without fighting vertical scroll
  compare.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    if (e.pointerType !== 'mouse' && e.buttons === 0) return;
    const r = compare.getBoundingClientRect();
    userTouched = true;
    setPos(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  });

  // Intro sweep: show the "after", then settle in the middle
  if (!reduceMotion) {
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

  /* ---------- card spotlight follows cursor ---------- */
  $$('.glow').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- magnetic buttons ---------- */
  if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- ember particles in hero ---------- */
  const canvas = $('.embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const hero = $('.hero');
    let w, h, dpr, particles = [], running = true;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, w / 14));
      particles = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + 0.6,
      vy: Math.random() * 0.6 + 0.25,
      drift: Math.random() * 0.6 - 0.3,
      phase: Math.random() * Math.PI * 2,
      life: Math.random() * 0.5 + 0.5,
    });
    const draw = (t) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.drift + Math.sin(t / 900 + p.phase) * 0.3;
        const fade = Math.max(0, Math.min(1, p.y / h)) * p.life;
        if (p.y < -10) Object.assign(p, spawn(false));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(255, 200, 120, ${0.9 * fade})`);
        g.addColorStop(0.3, `rgba(255, 110, 30, ${0.5 * fade})`);
        g.addColorStop(1, 'rgba(255, 80, 20, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    // pause when hero is off-screen to save battery
    new IntersectionObserver(([en]) => {
      const was = running;
      running = en.isIntersecting;
      if (running && !was) requestAnimationFrame(draw);
    }).observe(hero);

    addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
  }

  /* ---------- contact form ---------- */
  // No backend yet: this opens the visitor's email app with the request filled in.
  // To collect submissions directly, point the form at a service like Formspree or Netlify Forms.
  const form = $('#contact-form');
  const status = $('.form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((inp) => {
      const bad = !inp.value.trim() || (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
      inp.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { status.textContent = 'Please fill in your name, business, and a valid email.'; return; }

    const d = Object.fromEntries(new FormData(form));
    const body = `Name: ${d.name}\nBusiness: ${d.business}\nEmail: ${d.email}\nWebsite: ${d.website || '-'}\n\n${d.message || ''}`;
    location.href = `mailto:hello@foundrydigital.com?subject=${encodeURIComponent('Free website review: ' + d.business)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Thanks! Your email app should open with everything filled in. Just hit send.";
  });
})();
