/* Avi Garg portfolio - main.js
   Modules: theme toggle, sticky nav, scroll reveal, card media (inline video),
   lightbox player, project filters, read-more, back-to-top. No dependencies. */
(function () {
  'use strict';

  const reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initReveal();
    initCardMedia();
    initLightbox();
    initFilters();
    initReadMore();
    initTopButton();
    initYear();
  });

  /* ---------------------------------------------------------------- theme */
  function initTheme() {
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    const stored = safeGet('theme');
    if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);

    const current = () =>
      root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const sync = () => {
      const dark = current() === 'dark';
      if (btn) {
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#12131a' : '#ac3232');
    };

    if (btn) {
      btn.addEventListener('click', () => {
        const next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        safeSet('theme', next);
        sync();
      });
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
    sync();
  }

  /* ------------------------------------------------------------------ nav */
  function initNav() {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav__burger');
    const menu = document.getElementById('nav-menu');
    if (!nav) return;

    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        })
      );
    }

    // Highlight the section currently in view.
    const links = Array.from(document.querySelectorAll('.nav__menu a[href^="#"]'));
    const sections = links
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || !sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) =>
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id)
          );
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }

  /* --------------------------------------------------------------- reveal */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (reduceMotion() || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------- card media
     <video data-webm data-mp4 poster muted loop playsinline preload="none">
     Sources are attached lazily when the card scrolls into view, and the
     clip pauses when it scrolls out so ten videos never decode at once. */
  function initCardMedia() {
    const videos = document.querySelectorAll('video.card-media__video');
    if (!videos.length) return;

    const attach = (v) => {
      if (v.dataset.loaded) return;
      v.dataset.loaded = '1';
      addSources(v, v.dataset.webm, v.dataset.mp4);
      v.load();
    };

    const play = (v) => {
      if (reduceMotion()) return;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    };

    if (!('IntersectionObserver' in window)) {
      videos.forEach((v) => { attach(v); play(v); });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting) { attach(v); play(v); }
          else if (!v.paused) v.pause();
        });
      },
      { rootMargin: '120px 0px', threshold: 0.2 }
    );
    videos.forEach((v) => io.observe(v));

    document.addEventListener('visibilitychange', () => {
      videos.forEach((v) => {
        if (document.hidden) v.pause();
        else if (v.dataset.loaded && isInViewport(v)) play(v);
      });
    });
  }

  function addSources(video, webm, mp4) {
    // mp4 first: universally supported and, for these clips, usually smaller.
    if (mp4) {
      const s = document.createElement('source');
      s.src = mp4; s.type = 'video/mp4'; video.appendChild(s);
    }
    if (webm) {
      const s = document.createElement('source');
      s.src = webm; s.type = 'video/webm'; video.appendChild(s);
    }
  }

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  /* ------------------------------------------------------------- lightbox
     Any element with [data-lightbox] opens the modal. Attributes:
       data-type="video" | "image"
       data-mp4, data-webm, data-poster   (video)
       data-src, data-alt                 (image)
       data-title, data-caption           (optional)                     */
  function initLightbox() {
    const dlg = document.getElementById('lightbox');
    if (!dlg) return;
    const stage = dlg.querySelector('.lightbox__stage');
    const titleEl = dlg.querySelector('.lightbox__title');
    const capEl = dlg.querySelector('.lightbox__caption');
    const closeBtn = dlg.querySelector('.lightbox__close');
    let lastFocus = null;
    let restore = [];

    const supportsDialog = typeof dlg.showModal === 'function';

    function open(trigger) {
      const d = trigger.dataset;
      stage.innerHTML = '';
      titleEl.textContent = d.title || '';
      capEl.textContent = d.caption || '';
      capEl.hidden = !d.caption;

      if (d.type === 'video') {
        const v = document.createElement('video');
        v.controls = true;
        v.playsInline = true;
        v.preload = 'auto';
        if (d.poster) v.poster = d.poster;
        v.setAttribute('controlslist', 'nodownload');
        addSources(v, d.webm, d.mp4);
        stage.appendChild(v);
        // Pause the inline loops so audio and decoding do not fight.
        restore = Array.from(document.querySelectorAll('video.card-media__video'))
          .filter((cv) => !cv.paused);
        restore.forEach((cv) => cv.pause());
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        const img = document.createElement('img');
        img.src = d.src;
        img.alt = d.alt || d.title || '';
        img.decoding = 'async';
        stage.appendChild(img);
      }

      lastFocus = trigger;
      document.body.classList.add('has-modal');
      if (supportsDialog) dlg.showModal(); else { dlg.setAttribute('open', ''); }
      dlg.classList.add('is-open');
      closeBtn.focus();
    }

    function close() {
      const v = stage.querySelector('video');
      if (v) { v.pause(); v.removeAttribute('src'); v.innerHTML = ''; v.load(); }
      stage.innerHTML = '';
      dlg.classList.remove('is-open');
      if (supportsDialog && dlg.open) dlg.close(); else dlg.removeAttribute('open');
      document.body.classList.remove('has-modal');
      if (!reduceMotion()) restore.forEach((cv) => { if (isInViewport(cv)) cv.play().catch(() => {}); });
      restore = [];
      if (lastFocus) lastFocus.focus();
    }

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lightbox]');
      if (!t) return;
      e.preventDefault();
      open(t);
    });

    closeBtn.addEventListener('click', close);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dlg.addEventListener('click', (e) => {
      // Click on the backdrop (outside the panel) closes.
      if (e.target === dlg) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dlg.classList.contains('is-open')) close();
    });
  }

  /* -------------------------------------------------------------- filters */
  function initFilters() {
    const bar = document.querySelector('.filters');
    const cards = Array.from(document.querySelectorAll('.project-card'));
    if (!bar || !cards.length) return;
    const empty = document.querySelector('.projects__empty');

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      const f = btn.dataset.filter;
      bar.querySelectorAll('[data-filter]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      let shown = 0;
      cards.forEach((c) => {
        const tags = (c.dataset.tags || '').split(/\s+/);
        const show = f === 'all' || tags.includes(f);
        c.classList.toggle('is-hidden', !show);
        if (show) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ------------------------------------------------------------ read more */
  function initReadMore() {
    const descs = document.querySelectorAll('.project-card__desc');
    const check = () => {
      descs.forEach((p) => {
        const btn = p.parentElement.querySelector('.read-more');
        if (!btn) return;
        if (p.classList.contains('is-expanded')) return;
        const overflows = p.scrollHeight > p.clientHeight + 2;
        btn.hidden = !overflows;
      });
    };
    descs.forEach((p) => {
      const btn = p.parentElement.querySelector('.read-more');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const on = p.classList.toggle('is-expanded');
        btn.textContent = on ? 'Show less' : 'Read more';
        btn.setAttribute('aria-expanded', String(on));
      });
    });
    check();
    window.addEventListener('resize', debounce(check, 150));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
  }

  /* ----------------------------------------------------------- top button */
  function initTopButton() {
    const btn = document.getElementById('top-button');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' })
    );
  }

  function initYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------- utils */
  function debounce(fn, wait) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(fn, wait); };
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
})();
