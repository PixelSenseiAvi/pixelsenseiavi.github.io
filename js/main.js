(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initTopButton();
    initScrollReveal();
    initProjectsCarousel();
    initReadMore();
  });

  function initTopButton() {
    const intro = document.querySelector('.intro');
    const topButton = document.getElementById('top-button');
    if (!intro || !topButton) return;

    const threshold = intro.offsetHeight;
    const onScroll = () => {
      topButton.classList.toggle('is-visible', window.scrollY > threshold);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    topButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initScrollReveal() {
    if (typeof ScrollReveal !== 'function') return;
    const sr = ScrollReveal({
      reset: false,
      duration: 700,
      easing: 'cubic-bezier(.694,0,.335,1)',
      distance: '24px',
      origin: 'bottom',
      viewFactor: 0.15
    });
    sr.reveal('.background, .projects-section, .skills-section');
  }

  function initProjectsCarousel() {
    const wrapper = document.getElementById('projectsWrapper');
    const scroll = document.getElementById('projectsScroll');
    const buttonLeft = document.getElementById('scrollLeft');
    const buttonRight = document.getElementById('scrollRight');
    if (!wrapper || !scroll) return;

    const cardStep = () => {
      const card = scroll.querySelector('.project-card');
      if (!card) return 600;
      const style = getComputedStyle(card);
      return card.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    };

    const scrollByStep = (dir) => {
      wrapper.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
      scheduleAutoScroll();
    };

    if (buttonLeft) buttonLeft.addEventListener('click', () => scrollByStep(-1));
    if (buttonRight) buttonRight.addEventListener('click', () => scrollByStep(1));

    let autoTimer = null;
    let restartTimer = null;
    let isHovering = false;
    const tickMs = 5000;
    const restartMs = 15000;

    function tick() {
      if (isHovering) return;
      const atEnd = wrapper.scrollLeft + wrapper.clientWidth >= scroll.scrollWidth - 4;
      if (atEnd) {
        wrapper.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        wrapper.scrollBy({ left: cardStep(), behavior: 'smooth' });
      }
    }

    function startAutoScroll() {
      if (autoTimer || prefersReducedMotion()) return;
      autoTimer = setInterval(tick, tickMs);
    }

    function stopAutoScroll() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function scheduleAutoScroll() {
      stopAutoScroll();
      clearTimeout(restartTimer);
      restartTimer = setTimeout(startAutoScroll, restartMs);
    }

    wrapper.addEventListener('mouseenter', () => { isHovering = true; });
    wrapper.addEventListener('mouseleave', () => { isHovering = false; });
    wrapper.addEventListener('touchstart', scheduleAutoScroll, { passive: true });
    wrapper.addEventListener('wheel', scheduleAutoScroll, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoScroll();
      else scheduleAutoScroll();
    });

    setTimeout(startAutoScroll, 8000);
  }

  function initReadMore() {
    const buttons = document.querySelectorAll('.read-more');

    buttons.forEach((btn) => {
      const wrapper = btn.parentElement;
      const description = wrapper.querySelector('.project-description');
      const fade = wrapper.querySelector('.fade-bottom');

      btn.addEventListener('click', () => {
        const expanded = description.classList.toggle('expanded');
        if (fade) fade.style.display = expanded ? 'none' : 'block';
        btn.textContent = expanded ? 'Read Less' : 'Read More';
      });
    });

    const reevaluate = () => {
      buttons.forEach((btn) => {
        const wrapper = btn.parentElement;
        const description = wrapper.querySelector('.project-description');
        const fade = wrapper.querySelector('.fade-bottom');

        const overflows = description.scrollHeight > description.clientHeight + 4;
        btn.style.display = overflows ? 'inline-block' : 'none';
        if (fade) fade.style.display = overflows ? 'block' : 'none';
      });
    };

    setTimeout(reevaluate, 150);
    window.addEventListener('resize', debounce(reevaluate, 150));
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }
})();
