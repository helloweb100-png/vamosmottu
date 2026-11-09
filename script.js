/* =====================================================================
   VamosMottu · script.js
   Sin librerías externas: todo con JS y CSS nativos para que cargue
   rápido y la página se vea completa aunque falle cualquier recurso.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración (único lugar donde vive el número) ---------- */
  const WHATSAPP = '525562555583';   // formato internacional sin "+"; vacío = se oculta todo lo de WhatsApp
  const CODIGO = 'VAMOSMOTTU';
  const MSG_BASE = `Hola, quiero rentar una moto Mottu con el código ${CODIGO} y mi descuento de $350 en el pago inicial. ¿Me ayudan a empezar?`;

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMQ = window.matchMedia('(min-width: 1000px)');
  root.classList.add('js', 'ready');
  root.classList.remove('no-js');

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3600);
  }

  /* ---------- WhatsApp ---------- */
  const waNum = String(WHATSAPP || '').replace(/\D/g, '');
  const waUrl = (msg) => 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);

  function setupWhatsApp() {
    const links = $$('.js-wa');
    // Los enlaces tel: usan la misma constante, así el número solo vive aquí
    if (waNum) $$('a[href^="tel:"]').forEach((a) => { a.href = 'tel:+' + waNum; });
    const formBtn = $('#formBtn');
    const status = $('#formStatus');
    if (!waNum) {
      links.forEach((a) => { a.hidden = true; a.style.display = 'none'; });
      if (formBtn) { formBtn.hidden = true; formBtn.style.display = 'none'; }
      if (status) status.textContent = 'Muy pronto habilitaremos el envío por WhatsApp.';
      return;
    }
    links.forEach((a) => {
      a.href = waUrl(a.dataset.msg || MSG_BASE);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  /* ---------- Cargador ---------- */
  const heroEl = $('.hero');

  function startPage() {
    if (!heroEl || heroEl.classList.contains('is-ready')) return;
    $$('[data-hero]').forEach((el, i) => el.style.setProperty('--i', i));
    heroEl.classList.add('is-ready');
    initCounters();
  }

  function runLoader() {
    const el = $('#loader');
    const pct = $('#loaderPct');
    if (!el) { startPage(); return; }
    document.body.classList.add('is-loading');
    const MIN = 1250;
    const MAX = 1500;
    const t0 = performance.now();
    let done = false;
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const finish = () => {
      if (done) return;
      done = true;
      if (pct) pct.textContent = '100';
      el.classList.add('is-done');
      document.body.classList.remove('is-loading');
      startPage();
      setTimeout(() => el.classList.add('is-gone'), 950);
    };

    const tick = (now) => {
      if (done) return;
      const t = now - t0;
      if (pct) pct.textContent = String(Math.min(99, Math.round((t / MIN) * 100)));
      if ((t >= MIN && loaded) || t >= MAX) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, MAX + 250);   // respaldo por si requestAnimationFrame se pausa
  }

  /* ---------- Titular dividido en palabras ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = (node, parent) => {
      node.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) {
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w-i';
            inner.style.setProperty('--i', String(i++));
            inner.textContent = part;
            w.appendChild(inner);
            parent.appendChild(w);
          });
        } else if (ch.nodeType === 1) {
          const clone = ch.cloneNode(false);
          parent.appendChild(clone);
          walk(ch, clone);
        }
      });
    };
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', label);
  }

  /* ---------- Marquesinas infinitas ---------- */
  const mqAnims = [];
  function setupMarquees() {
    $$('.mq').forEach((mq) => {
      const track = $('.mq__track', mq);
      const group = track && $('.mq__g', track);
      if (!group) return;
      const gw = group.offsetWidth || 600;
      const need = Math.ceil(window.innerWidth / gw) + 1;
      for (let i = 1; i < need * 2; i++) {
        const c = group.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      }
      mq.classList.add('is-ready');
      if (track.getAnimations) track.getAnimations().forEach((a) => mqAnims.push(a));
    });
  }
  let mqBoost = 0;
  let mqLoop = false;
  function boostLoop() {
    mqBoost *= 0.93;
    const rate = 1 + mqBoost;
    mqAnims.forEach((a) => { try { a.playbackRate = rate; } catch (e) { /* sin soporte */ } });
    if (mqBoost > 0.02) requestAnimationFrame(boostLoop);
    else { mqLoop = false; mqAnims.forEach((a) => { try { a.playbackRate = 1; } catch (e) { /* sin soporte */ } }); }
  }

  /* ---------- Revelado al hacer scroll (con respaldo por geometría) ---------- */
  let revealItems = [];
  const show = (el) => el.classList.add('is-in');
  let revealIO = null;
  function setupReveal() {
    $$('[data-reveal-group]').forEach((g) => {
      $$(':scope > [data-reveal]', g).forEach((c, i) => c.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
    });
    revealItems = $$('[data-reveal]');
    if ('IntersectionObserver' in window) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { show(en.target); revealIO.unobserve(en.target); }
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });
      revealItems.forEach((el) => revealIO.observe(el));
    } else {
      revealItems.forEach(show);
    }
  }
  function sweepReveal() {
    if (!revealItems.length) return;
    const h = window.innerHeight;
    revealItems = revealItems.filter((el) => {
      if (el.classList.contains('is-in')) return false;
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.98 && r.bottom > 0) { show(el); return false; }
      return true;
    });
  }

  /* ---------- Contadores ---------- */
  let countersStarted = false;
  function initCounters() {
    if (countersStarted) return;
    countersStarted = true;
    if (reduce || !('IntersectionObserver' in window)) return;
    const run = (el) => {
      const to = parseFloat(el.dataset.count);
      if (Number.isNaN(to)) return;
      const t0 = performance.now();
      const dur = 1500;
      const step = (now) => {
        const k = clamp((now - t0) / dur, 0, 1);
        const v = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * v).toLocaleString('es-MX');
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  /* ---------- Copiar código ---------- */
  function setupCopy() {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const txt = btn.dataset.copy;
        let ok = false;
        try {
          await navigator.clipboard.writeText(txt);
          ok = true;
        } catch (err) {
          const ta = document.createElement('textarea');
          ta.value = txt;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
          document.body.appendChild(ta);
          ta.select();
          try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
          ta.remove();
        }
        toast(ok ? `¡Código ${txt} copiado! Pégalo en la app al registrarte.` : `Tu código es ${txt}. Cópialo y pégalo en la app.`);
        const lbl = $('span', btn);
        if (lbl && ok) {
          const old = lbl.textContent;
          lbl.textContent = '¡Copiado!';
          btn.classList.add('is-ok');
          setTimeout(() => { lbl.textContent = old; btn.classList.remove('is-ok'); }, 1800);
        }
      });
    });
  }

  /* ---------- Menú móvil ---------- */
  function setupNav() {
    const burger = $('#burger');
    if (!burger) return;
    const setNav = (open) => {
      root.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    burger.addEventListener('click', () => setNav(!root.classList.contains('nav-open')));
    $$('.nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
    window.addEventListener('resize', () => { if (desktopMQ.matches) setNav(false); });
  }

  /* ---------- Escena 3D del hero ---------- */
  let heroVisible = true;
  function setupScene() {
    const sc = $('[data-scene]');
    if (!sc) return;
    const stage = $('#stage');
    const cards = $$('.card', sc);
    let order = cards.map((c, i) => i);
    if (!reduce) {
      setInterval(() => {
        if (document.hidden || !heroVisible) return;
        order = order.map((p) => (p + 2) % 3);
        cards.forEach((c, i) => { c.dataset.pos = String(order[i]); });
      }, 4400);
    }
    if (fine && !reduce && stage) {
      const area = heroEl || sc;
      area.addEventListener('pointermove', (e) => {
        const r = sc.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.8, 0.8);
        const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.8, 0.8);
        stage.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg');
        stage.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      }, { passive: true });
      area.addEventListener('pointerleave', () => {
        stage.style.setProperty('--ry', '0deg');
        stage.style.setProperty('--rx', '0deg');
      });
    }
  }

  /* ---------- Partículas del hero ---------- */
  function setupParticles() {
    const c = $('#fx');
    if (!c || reduce) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let ps = [];
    let running = false;
    const mouse = { x: -999, y: -999 };

    const make = (init) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(0.15 + Math.random() * 0.6),
      r: 0.6 + Math.random() * 1.9,
      a: 0.25 + Math.random() * 0.6,
      lima: Math.random() < 0.2
    });

    const resize = () => {
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 15000, 26, 90));
      ps = Array.from({ length: n }, () => make(true));
    };

    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 0.9; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > w + 10) ps[i] = make(false);
        ctx.beginPath();
        ctx.fillStyle = p.lima ? `rgba(184,255,60,${p.a})` : `rgba(0,232,58,${p.a})`;
        ctx.shadowColor = p.lima ? 'rgba(184,255,60,.9)' : 'rgba(0,232,58,.9)';
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const d = dx * dx + dy * dy;
          if (d < 10000) {
            ctx.strokeStyle = `rgba(0,232,58,${(1 - d / 10000) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    };

    const start = () => { if (running) return; running = true; requestAnimationFrame(frame); };
    const stop = () => { running = false; };

    resize();
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    if (heroEl) {
      heroEl.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      }, { passive: true });
      heroEl.addEventListener('pointerleave', () => { mouse.x = -999; mouse.y = -999; });
    }
    if ('IntersectionObserver' in window && heroEl) {
      new IntersectionObserver((en) => {
        heroVisible = en[0].isIntersecting;
        if (heroVisible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(heroEl);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (heroVisible) start(); });
  }

  /* ---------- Inclinación 3D, foco de luz y botones magnéticos ---------- */
  function setupPointerFx() {
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      }, { passive: true });
    });
    if (!fine || reduce) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      }, { passive: true });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.translate = (x * 0.18).toFixed(1) + 'px ' + (y * 0.28).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
    const cur = $('.cursor');
    if (cur) {
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;
      let running = false;
      const loop = () => {
        cx += (tx - cx) * 0.14;
        cy += (ty - cy) * 0.14;
        cur.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.4) requestAnimationFrame(loop);
        else running = false;
      };
      window.addEventListener('pointermove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        cur.classList.add('is-on');
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    }
  }

  /* ---------- Imagen que se abre con el scroll ---------- */
  const expandEl = $('[data-expand]');
  function updateExpand() {
    if (!expandEl || !expandEl.classList.contains('is-scrub')) return;
    const r = expandEl.getBoundingClientRect();
    const total = expandEl.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const raw = clamp(-r.top / total, 0, 1);
    const k = clamp(raw / 0.62, 0, 1);
    expandEl.style.setProperty('--p', (k * k * (3 - 2 * k)).toFixed(4));
  }

  /* ---------- Pasos con teléfono ---------- */
  const stepsSec = $('[data-steps]');
  const stepEls = $$('.step');
  const screens = $$('.screen');
  let curStep = 0;
  function setStep(i) {
    if (i === curStep && stepEls[i] && stepEls[i].classList.contains('is-active')) return;
    curStep = i;
    stepEls.forEach((s, k) => s.classList.toggle('is-active', k === i));
    screens.forEach((s, k) => s.classList.toggle('is-on', k === i));
  }
  function updateSteps() {
    if (!stepsSec || !desktopMQ.matches || !stepEls.length) return;
    const mid = window.innerHeight * 0.5;
    let best = 0;
    let bd = Infinity;
    stepEls.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    setStep(best);
    const list = $('.steps__list');
    if (list) {
      const lr = list.getBoundingClientRect();
      list.style.setProperty('--rp', clamp((mid - lr.top - 40) / Math.max(1, lr.height - 260), 0, 1).toFixed(3));
    }
  }
  function setupStepsAuto() {
    const phone = $('[data-phone]');
    if (!phone || reduce) return;
    let seen = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { seen = en[0].isIntersecting; }, { threshold: 0.2 }).observe(phone);
    }
    setInterval(() => {
      if (desktopMQ.matches || document.hidden || !seen) return;
      setStep((curStep + 1) % Math.max(1, screens.length));
    }, 3300);
  }

  /* ---------- Galería horizontal fijada ---------- */
  const reelEl = $('[data-reel]');
  const trackEl = $('[data-track]');
  const reelBar = $('#reelBar');
  const reelView = reelEl && $('.reel__viewport', reelEl);
  let reelTravel = 0;
  function measureReel() {
    if (!reelEl || !trackEl) return;
    const pin = desktopMQ.matches && !reduce;
    reelEl.classList.toggle('is-pin', pin);
    if (!pin) { trackEl.style.transform = ''; reelEl.style.removeProperty('--h'); return; }
    const pad = parseFloat(getComputedStyle(reelView).paddingLeft) || 0;
    reelTravel = Math.max(0, trackEl.scrollWidth + pad * 2 - window.innerWidth);
    reelEl.style.setProperty('--h', Math.round(reelTravel + window.innerHeight * 1.15) + 'px');
  }
  function updateReel() {
    if (!reelEl || !trackEl) return;
    if (reelEl.classList.contains('is-pin')) {
      const r = reelEl.getBoundingClientRect();
      const total = reelEl.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      trackEl.style.transform = `translate3d(${(-p * reelTravel).toFixed(1)}px, 0, 0)`;
      if (reelBar) reelBar.style.setProperty('--rp', Math.max(0.05, p).toFixed(3));
    } else if (reelView && reelBar) {
      const max = reelView.scrollWidth - reelView.clientWidth;
      reelBar.style.setProperty('--rp', (max > 0 ? Math.max(0.05, reelView.scrollLeft / max) : 0.05).toFixed(3));
    }
  }
  function setupReel() {
    if (!reelEl) return;
    measureReel();
    $$('img', trackEl).forEach((im) => im.addEventListener('load', measureReel));
    if (reelView) reelView.addEventListener('scroll', updateReel, { passive: true });
    if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', () => { measureReel(); onScroll(); });
  }

  /* ---------- Video de la galería ---------- */
  function setupVideo() {
    const clip = $('#clip');
    if (!clip) return;
    const snd = $('#clipSound');
    const src = $('source', clip);
    // Si el video no carga, se quita su tarjeta; al conocer su proporción real se recalcula la galería
    const dropCard = () => {
      const li = clip.closest('.rcard');
      if (li) li.remove();
      measureReel();
      onScroll();
    };
    if (src) src.addEventListener('error', dropCard);
    clip.addEventListener('error', dropCard);
    clip.addEventListener('loadedmetadata', () => { measureReel(); onScroll(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        en.forEach((e) => {
          if (e.isIntersecting) { const p = clip.play(); if (p && p.catch) p.catch(() => {}); }
          else clip.pause();
        });
      }, { threshold: 0.35 }).observe(clip);
    }
    if (snd) {
      snd.addEventListener('click', () => {
        clip.muted = !clip.muted;
        snd.setAttribute('aria-pressed', String(!clip.muted));
        snd.textContent = clip.muted ? 'Activar sonido' : 'Silenciar';
        if (!clip.muted) { const p = clip.play(); if (p && p.catch) p.catch(() => {}); }
      });
    }
  }

  /* ---------- Simulador de renta ---------- */
  function setupSim() {
    const sim = $('[data-sim]');
    if (!sim) return;
    const tabs = $$('.sim__tabs button', sim);
    const out = { day: $('[data-out="day"]', sim), week: $('[data-out="week"]', sim), month: $('[data-out="month"]', sim) };
    const waBtn = $('[data-sim-wa]', sim);
    const fmt = (n) => Math.round(n).toLocaleString('es-MX');
    const current = { day: 55, week: 385, month: 1650 };
    const tween = (key, to) => {
      const from = current[key];
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / 550, 0, 1);
        const v = 1 - Math.pow(1 - k, 3);
        if (out[key]) out[key].textContent = fmt(from + (to - from) * v);
        if (k < 1) requestAnimationFrame(step);
      };
      current[key] = to;
      if (reduce) { if (out[key]) out[key].textContent = fmt(to); return; }
      requestAnimationFrame(step);
    };
    const setPlan = (btn) => {
      tabs.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
      });
      const d = Number(btn.dataset.day);
      tween('day', d);
      tween('week', d * 7);
      tween('month', d * 30);
      if (waBtn) {
        const m = `Hola, quiero rentar el plan ${btn.dataset.name} ($${d} al día) de Mottu con el código ${CODIGO}.`;
        waBtn.dataset.msg = m;
        if (waNum) waBtn.href = waUrl(m);
      }
    };
    tabs.forEach((b) => b.addEventListener('click', () => setPlan(b)));
  }

  /* ---------- FAQ: una respuesta abierta a la vez ---------- */
  function setupFaq() {
    const list = $('[data-faq]');
    if (!list) return;
    list.addEventListener('toggle', (e) => {
      if (!e.target.open) return;
      $$('details', list).forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  }

  /* ---------- Formulario → WhatsApp ---------- */
  function setupForm() {
    const form = $('#formulario');
    if (!form) return;
    const status = $('#formStatus');
    const say = (t) => { if (status) status.textContent = t; };
    const nameInput = form.elements.nombre;
    if (nameInput) nameInput.addEventListener('input', () => nameInput.classList.remove('is-bad'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = (form.elements.nombre.value || '').trim();
      if (!nombre) {
        form.elements.nombre.classList.add('is-bad');
        form.elements.nombre.focus();
        say('Escribe tu nombre para armar tu mensaje.');
        return;
      }
      if (!waNum) { say('Muy pronto habilitaremos el envío por WhatsApp.'); return; }
      const extra = (form.elements.mensaje.value || '').trim();
      const lines = [
        `Hola, soy ${nombre}. Quiero rentar una moto Mottu con el código ${CODIGO} y mi descuento de $350.`,
        `Plan de interés: ${form.elements.plan.value}`,
        `Mi zona: ${form.elements.zona.value}`,
        `Licencia de moto: ${form.elements.licencia.value}`
      ];
      if (extra) lines.push(`Mensaje: ${extra}`);
      const url = waUrl(lines.join('\n'));
      say('Abriendo WhatsApp con tu mensaje…');
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url;
    });
  }

  /* ---------- Navegación activa ---------- */
  const navMap = $$('.nav a[href^="#"]:not(.btn)')
    .map((a) => ({ a, sec: $(a.getAttribute('href')) }))
    .filter((x) => x.sec);
  function updateNav() {
    if (!navMap.length) return;
    const line = window.innerHeight * 0.4;
    let active = null;
    navMap.forEach((x) => { if (x.sec.getBoundingClientRect().top <= line) active = x; });
    navMap.forEach((x) => x.a.classList.toggle('is-active', x === active));
  }

  /* ---------- Bucle de scroll ---------- */
  const hdrEl = $('#top');
  const progEl = $('#progress');
  const heroGrid = $('.hero__grid');
  const heroFx = $('#fx');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = root.scrollHeight - vh;
      if (progEl) progEl.style.setProperty('--p', (max > 0 ? y / max : 0).toFixed(4));
      if (hdrEl) hdrEl.classList.toggle('is-scrolled', y > 24);

      if (heroGrid && y < vh * 1.3 && !reduce) {
        heroGrid.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
        heroGrid.style.opacity = String(clamp(1 - y / (vh * 0.95), 0, 1));
        if (heroFx) heroFx.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
      }

      updateExpand();
      updateSteps();
      updateReel();
      updateNav();
      sweepReveal();

      const dv = Math.abs(y - lastY);
      lastY = y;
      if (dv > 0 && mqAnims.length && !reduce) {
        mqBoost = Math.min(5, mqBoost + dv * 0.06);
        if (!mqLoop && mqBoost > 0.05) { mqLoop = true; requestAnimationFrame(boostLoop); }
      }
    });
  }

  /* ---------- Arranque ---------- */
  setupWhatsApp();
  const h1 = $('[data-split]');
  if (h1) splitWords(h1);
  setupMarquees();
  runLoader();
  setupReveal();
  setupCopy();
  setupNav();
  setupScene();
  setupParticles();
  setupPointerFx();
  setupSim();
  setupFaq();
  setupForm();
  setupVideo();
  setupStepsAuto();
  if (expandEl && !reduce) expandEl.classList.add('is-scrub');
  setupReel();
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measureReel(); onScroll(); });
  window.addEventListener('load', () => { measureReel(); onScroll(); });
  setTimeout(() => { sweepReveal(); onScroll(); }, 2000);
  onScroll();
})();
