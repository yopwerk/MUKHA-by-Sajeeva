/**
 * MUKHĀ BY SAJEEVA — main.js
 * Safari-safe, no syntax errors, clean IIFE
 */
(function () {
  'use strict';

  /* ── UTILS ─────────────────────────────────────────── */
  function $(id)   { return document.getElementById(id); }
  function $q(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── 01 · CURSOR GLOW ──────────────────────────────── */
  var glowEl = document.createElement('div');
  glowEl.className = 'cursor-glow';
  document.body.appendChild(glowEl);
  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var gx = mx, gy = my;
  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function animGlow() {
    gx = lerp(gx, mx, 0.1); gy = lerp(gy, my, 0.1);
    glowEl.style.left = gx + 'px'; glowEl.style.top = gy + 'px';
    requestAnimationFrame(animGlow);
  })();

  /* ── 02 · NAV adaptive light/dark ─────────────────── */
  var nav    = $q('.nav');
  var burger = $('nav-burger');
  var mob    = $('nav-mobile');
  var darkSections = ['hero', 'konsultasi'];

  function updateNav() {
    if (!nav) return;
    var nb = nav.getBoundingClientRect().bottom;
    var isDark = true;
    $$('section[id]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top <= nb && r.bottom >= nb) {
        isDark = darkSections.indexOf(el.id) !== -1;
      }
    });
    var footer = $q('.footer');
    if (footer) {
      var fr = footer.getBoundingClientRect();
      if (fr.top <= nb && fr.bottom >= nb) isDark = true;
    }
    nav.classList.toggle('nav--dark',    isDark);
    nav.classList.toggle('nav--light',   !isDark);
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  function closeMob() {
    if (!burger || !mob) return;
    burger.setAttribute('aria-expanded', 'false');
    mob.hidden = true;
  }
  if (burger && mob) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mob.hidden = open;
    });
    $$('#nav-mobile a').forEach(function (a) { a.addEventListener('click', closeMob); });
    document.addEventListener('click', function (e) {
      if (mob.hidden) return;
      if (nav && !nav.contains(e.target)) closeMob();
    });
  }

  /* ── 03 · LANGUAGE SWITCH ──────────────────────────── */
  var currentLang = 'id';

  /* On init: for every element with data-en, make sure data-id = current text
     so we always have a clean source of truth for ID content */
  $$('[data-en]').forEach(function (el) {
    /* Only leaf text nodes — skip containers with children that also have data-en */
    if (!el.getAttribute('data-id')) {
      var inner = el.querySelector('.split-word-inner');
      if (inner) {
        el.setAttribute('data-id', inner.textContent.trim());
      } else if (el.children.length === 0) {
        el.setAttribute('data-id', el.textContent.trim());
      }
    }
  });

  function applyLang(lang) {
    var key = lang === 'en' ? 'en' : 'id';

    /* Simple: process EVERY element with data-en or data-id attribute
       Update its textContent directly */
    $$('[data-' + key + ']').forEach(function (el) {
      var val = el.getAttribute('data-' + key);
      if (!val) return;

      /* Priority: if element has .split-word-inner, update that */
      var inner = el.querySelector('.split-word-inner');
      if (inner) {
        inner.textContent = val;
        return;
      }

      /* If NO children, just set textContent */
      if (el.children.length === 0) {
        el.textContent = val;
        return;
      }

      /* Has children (mixed content): try to update direct text nodes only */
      var foundText = false;
      var nodes = el.childNodes;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
          nodes[i].textContent = val + ' ';
          foundText = true;
          break;
        }
      }

      /* If no text node found in direct children, look for direct child with text */
      if (!foundText) {
        for (var i = 0; i < el.children.length; i++) {
          var child = el.children[i];
          if (child.children.length === 0 && child.textContent.trim()) {
            child.textContent = val;
            break;
          }
        }
      }
    });
  }

  function switchLang(lang) {
    if (lang === currentLang) return;
    currentLang = lang;

    /* Animate out */
    document.body.classList.add('lang-switching');

    $$('.lang-btn').forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('lang-btn--active', active);
      b.setAttribute('aria-pressed', String(active));
    });

    setTimeout(function () {
      applyLang(lang);
      document.body.classList.remove('lang-switching');
    }, 180);

    document.documentElement.lang = lang === 'en' ? 'en' : 'id';
    document.title = lang === 'en'
      ? 'Mukhā by Sajeeva — Property Transformation'
      : 'Mukhā by Sajeeva — Transformasi Properti Berkelas';
  }

  $$('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchLang(btn.getAttribute('data-lang'));
    });
  });

  /* Initialize ba thumb switcher */
  (function() {
    var baThumbs = $$('.ba__thumb');
    baThumbs.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.getAttribute('data-idx'));
        baThumbs.forEach(function(b) {
          b.classList.remove('ba__thumb--active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('ba__thumb--active');
        btn.setAttribute('aria-selected', 'true');
        var baPanels = $$('.ba[id^="ba-"]');
        baPanels.forEach(function(ba, i) {
          if (i !== idx) ba.setAttribute('hidden', '');
          else {
            ba.removeAttribute('hidden');
            initBA(ba); // init slider jika belum
          }
        });
      });
    });
  })();

  /* ── 04 · SCROLL REVEAL ────────────────────────────── */
  /* Wrap split-text words */
  $$('[data-animate="split-text"]').forEach(function (el) {
    el.querySelectorAll('.split-word').forEach(function (word, i) {
      var inner = document.createElement('span');
      inner.className = 'split-word-inner split-word-inner--d' + Math.min(i + 1, 3);
      while (word.firstChild) inner.appendChild(word.firstChild);
      word.appendChild(inner);
    });
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el  = en.target;
        var del = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-visible'); }, del);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
    $$('[data-animate]').forEach(function (el) { io.observe(el); });
    $$('.section-wipe').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-animate]').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ── 05 · HERO logo fade-in ────────────────────────── */
  var heroLogo = $q('.hero__logo-img');
  if (heroLogo) {
    heroLogo.setAttribute('data-animate', 'fade-up');
    setTimeout(function () { heroLogo.classList.add('is-visible'); }, 100);
  }

  /* ── 06 · COUNTERS ─────────────────────────────────── */
  function animCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(e * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        animCount(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  } else {
    $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ── 07 · PARALLAX ─────────────────────────────────── */
  var heroBg   = $q('.hero__bg-img');
  var heroBody = $q('.hero__body');
  var heroMet  = $q('.hero__metrics');

  if (heroBg) {
    setTimeout(function () { heroBg.classList.add('is-loaded'); }, 80);
    var ptick = false;
    window.addEventListener('scroll', function () {
      if (ptick) return;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        heroBg.style.transform  = 'translateY(' + (y * 0.28) + 'px) scale(1.08)';
        if (heroBody) heroBody.style.transform = 'translateY(' + (y * -0.06) + 'px)';
        if (heroMet)  heroMet.style.transform  = 'translateY(' + (y * -0.04) + 'px)';
        ptick = false;
      });
      ptick = true;
    }, { passive: true });
  }

  /* ── 08 · CURSOR PARALLAX on hero ──────────────────── */
  var heroEl = $q('.hero');
  if (heroEl && window.matchMedia('(hover:hover)').matches) {
    var hcx = 0, hcy = 0, tcx = 0, tcy = 0;
    heroEl.addEventListener('mousemove', function (e) {
      var r = heroEl.getBoundingClientRect();
      tcx = ((e.clientX - r.left) / r.width  - 0.5) * 18;
      tcy = ((e.clientY - r.top)  / r.height - 0.5) * 10;
    });
    heroEl.addEventListener('mouseleave', function () { tcx = 0; tcy = 0; });
    (function animHero() {
      hcx = lerp(hcx, tcx, 0.08);
      hcy = lerp(hcy, tcy, 0.08);
      if (heroBg) heroBg.style.transform = 'translate(' + (hcx * 0.6) + 'px,' + (hcy * 0.6) + 'px) scale(1.08)';
      if (heroBody) heroBody.style.transform = 'translate(' + (hcx * -0.3) + 'px,' + (hcy * -0.3) + 'px)';
      requestAnimationFrame(animHero);
    })();
  }

  /* ── 09 · MAGNETIC BUTTONS ─────────────────────────── */
  if (window.matchMedia('(hover:hover)').matches) {
    $$('.magnetic').forEach(function (btn) {
      var bx = 0, by = 0, tbx = 0, tby = 0, raf;
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        tbx = (e.clientX - r.left - r.width  / 2) * 0.35;
        tby = (e.clientY - r.top  - r.height / 2) * 0.35;
      });
      btn.addEventListener('mouseleave', function () { tbx = 0; tby = 0; });
      function animMag() {
        bx = lerp(bx, tbx, 0.14); by = lerp(by, tby, 0.14);
        btn.style.transform = 'translate(' + bx + 'px,' + by + 'px)';
        raf = requestAnimationFrame(animMag);
      }
      btn.addEventListener('mouseenter', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(animMag); });
      btn.addEventListener('mouseleave', function () {
        setTimeout(function () { cancelAnimationFrame(raf); btn.style.transform = ''; }, 400);
      });
    });
  }

  /* ── 10 · MATRIX 3D TILT ───────────────────────────── */
  if (window.matchMedia('(hover:hover)').matches) {
    $$('.matrix__card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r  = card.getBoundingClientRect();
        var cx = (e.clientX - r.left) / r.width  - 0.5;
        var cy = (e.clientY - r.top)  / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (cy * -10) + 'deg) rotateY(' + (cx * 10) + 'deg) translateZ(10px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  /* ── 11 · BEFORE–AFTER SLIDER ──────────────────────── */
  function initBA(baEl) {
    if (!baEl || baEl._baInited) return;
    baEl._baInited = true;

    var track   = baEl.querySelector('.ba__track');
    var divider = baEl.querySelector('.ba__divider');
    var before  = baEl.querySelector('.ba__side--before');
    var after   = baEl.querySelector('.ba__side--after');
    if (!track || !divider || !before || !after) return;

    before.style.position = 'absolute'; before.style.inset = '0';
    after.style.position  = 'absolute'; after.style.inset  = '0';

    var pct = 50, rafBA = null;
    function applyBA() {
      divider.style.left    = pct + '%';
      before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      after.style.clipPath  = 'inset(0 0 0 ' + pct + '%)';
      rafBA = null;
    }
    applyBA();

    function moveBA(x) {
      var r = track.getBoundingClientRect();
      pct = Math.max(5, Math.min(95, ((x - r.left) / r.width) * 100));
      if (!rafBA) rafBA = requestAnimationFrame(applyBA);
    }

    var drag = false;
    divider.addEventListener('mousedown', function (e) { drag = true; baEl.classList.add('ba--dragging'); e.preventDefault(); });
    document.addEventListener('mousemove', function (e) { if (drag) moveBA(e.clientX); });
    document.addEventListener('mouseup',   function ()  { drag = false; baEl.classList.remove('ba--dragging'); });

    var tid = null;
    function onTS(e) { tid = e.changedTouches[0].identifier; baEl.classList.add('ba--dragging'); }
    function onTM(e) {
      var touches = Array.prototype.slice.call(e.changedTouches);
      var t = null;
      for (var i = 0; i < touches.length; i++) { if (touches[i].identifier === tid) { t = touches[i]; break; } }
      if (t) { moveBA(t.clientX); e.preventDefault(); }
    }
    function onTE() { tid = null; baEl.classList.remove('ba--dragging'); }

    divider.addEventListener('touchstart',  onTS, { passive: true });
    divider.addEventListener('touchmove',   onTM, { passive: false });
    divider.addEventListener('touchend',    onTE, { passive: true });
    track.addEventListener('touchstart',    onTS, { passive: true });
    track.addEventListener('touchmove',     onTM, { passive: false });
    track.addEventListener('touchend',      onTE, { passive: true });
  }

  // Init ba-1 on load
  initBA($('ba-1'));

  /* ── 12 · STEPPER ──────────────────────────────────── */
  var sTabs   = $$('.stepper__tab');
  var sPanels = $$('.stepper__panel');
  var sPrev   = $('s-prev');
  var sNext   = $('s-next');
  var sLabel  = $('s-label');
  var sDots   = $$('.stepper__dot');
  var sIdx    = 0;
  var sAutoTimer = null;
  var sIsMobile = function() { return window.innerWidth < 1024; };

  function goStep(n) {
    sIdx = Math.max(0, Math.min(n, sTabs.length - 1));
    sTabs.forEach(function (t, i) {
      t.classList.toggle('stepper__tab--active', i === sIdx);
      t.setAttribute('aria-selected', String(i === sIdx));
    });
    sPanels.forEach(function (p, i) { p.hidden = i !== sIdx; });
    sDots.forEach(function (d, i) {
      d.classList.toggle('stepper__dot--active', i === sIdx);
      d.setAttribute('aria-current', String(i === sIdx));
    });
    if (sPrev)  sPrev.disabled  = sIdx === 0;
    if (sNext)  sNext.disabled  = sIdx === sTabs.length - 1;
    if (sLabel) sLabel.textContent = '0' + (sIdx + 1) + ' / 0' + sTabs.length;
    
    // Mobile: scroll carousel to current slide
    if (sIsMobile()) {
      scrollToSlide(sIdx);
    }
    
    // Reset auto-carousel timer on manual interaction
    if (sIsMobile()) {
      clearTimeout(sAutoTimer);
      sAutoTimer = setTimeout(autoNextSlide, 4000);
    }
  }

  function autoNextSlide() {
    if (sIsMobile()) {
      var nextIdx = (sIdx + 1) % sTabs.length;
      goStep(nextIdx);
      scrollToSlide(nextIdx);
    }
  }

  function scrollToSlide(idx) {
    var panels = $q('.stepper__panels');
    if (!panels) return;
    var panelWidth = panels.scrollWidth / sTabs.length;
    panels.scrollLeft = panelWidth * idx;
  }
  
  // Add smooth nudge animation to hint swipeable content
  function nudgeSlide() {
    var panels = $q('.stepper__panels');
    if (!panels || !sIsMobile()) return;
    
    // Subtle slide to right and back to hint swipe capability
    var originalScroll = panels.scrollLeft;
    panels.style.scrollBehavior = 'smooth';
    
    setTimeout(function() {
      panels.scrollLeft = originalScroll + 40; // Nudge 40px right
      setTimeout(function() {
        panels.scrollLeft = originalScroll; // Back to original
      }, 800);
    }, 1000);
  }
  sTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { goStep(i); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goStep(i + 1); (sTabs[Math.min(i + 1, sTabs.length - 1)] || t).focus(); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goStep(i - 1); (sTabs[Math.max(i - 1, 0)] || t).focus(); }
    });
  });
  sDots.forEach(function (d, i) {
    d.addEventListener('click', function () { goStep(i); });
  });
  if (sPrev) sPrev.addEventListener('click', function () { goStep(sIdx - 1); });
  if (sNext) sNext.addEventListener('click', function () { goStep(sIdx + 1); });
  goStep(0);
  
  // Start auto-carousel on mobile with nudge hint when section visible
  if (sIsMobile()) {
    var processSec = $q('#proses');
    if (processSec && 'IntersectionObserver' in window) {
      var stepperIO = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) {
          if (en.isIntersecting && !sAutoTimer) {
            nudgeSlide(); // Initial nudge hint
            sAutoTimer = setTimeout(autoNextSlide, 4000);
            stepperIO.unobserve(processSec);
          }
        });
      }, { threshold: 0.3 });
      stepperIO.observe(processSec);
    } else {
      nudgeSlide();
      sAutoTimer = setTimeout(autoNextSlide, 4000);
    }
  }
  
  // Handle window resize to start/stop carousel
  window.addEventListener('resize', function () {
    if (!sIsMobile() && sAutoTimer) {
      clearTimeout(sAutoTimer);
      sAutoTimer = null;
    } else if (sIsMobile() && !sAutoTimer) {
      sAutoTimer = setTimeout(autoNextSlide, 4000);
    }
  });

  /* ── 13 · STYLE TABS ───────────────────────────────── */
  var stPills  = $$('.style-pill');
  var stPanels = $$('.style-panel');

  function goStyle(n) {
    stPills.forEach(function (p, i) {
      p.classList.toggle('style-pill--active', i === n);
      p.setAttribute('aria-selected', String(i === n));
    });
    stPanels.forEach(function (p, i) { p.hidden = i !== n; });
  }
  stPills.forEach(function (p, i) {
    p.addEventListener('click', function () { goStyle(i); });
    p.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); var nx = Math.min(i + 1, stPills.length - 1); goStyle(nx); stPills[nx].focus(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); var pv = Math.max(i - 1, 0); goStyle(pv); stPills[pv].focus(); }
    });
  });

  /* ── 14 · FAQ ──────────────────────────────────────── */
  $$('.faq__q').forEach(function (btn) {
    var ans = document.getElementById(btn.getAttribute('aria-controls'));
    if (!ans) return;
    ans.hidden = false;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      $$('.faq__q').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        var a = document.getElementById(b.getAttribute('aria-controls'));
        if (a) a.classList.remove('is-open');
      });
      if (!open) { btn.setAttribute('aria-expanded', 'true'); ans.classList.add('is-open'); }
    });
  });


  /* ── 15 · SLOT PICKER — Modal popup calendar + jam dropdown ─── */
  (function () {
    var modal        = $('cal-modal');
    var backdrop     = $('cal-modal-backdrop');
    var modalClose   = $('cal-modal-close');
    var modalConfirm = $('cal-modal-confirm');
    var trigger      = $('jadwal-trigger');
    var triggerText  = $('jadwal-trigger-text');
    if (!modal || !trigger) return;

    var calGrid     = $('cal-grid');
    var calMonthLbl = $('cal-month-label');
    var calPrev     = $('cal-prev');
    var calNext     = $('cal-next');
    var calSlots    = $('cal-slots');
    var calSlotsLbl = $('cal-slots-label');
    var calSlotSel  = $('cal-slot-select');
    var calLoading  = $('cal-loading');
    var calNoAvail  = $('cal-noavail');
    var calSelected = $('cal-selected');
    var calSelLbl   = $('cal-selected-label');
    var hiddenInput = $('f-jadwal');

    var today       = new Date();
    today.setHours(0,0,0,0);
    var curYear     = today.getFullYear();
    var curMonth    = today.getMonth();
    var selectedDate  = null;
    var selectedSlot  = null;
    var selectedLabel = null;
    var busyDates     = [];
    var slotsCache    = {};

    var MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];
    var DAYS_AHEAD = (window.MUKHA_CONFIG || {}).CALENDAR_DAYS_AHEAD || 30;

    var maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + DAYS_AHEAD);

    function toDateStr(d) {
      var y  = d.getFullYear();
      var m  = String(d.getMonth()+1).padStart(2,'0');
      var dd = String(d.getDate()).padStart(2,'0');
      return y + '-' + m + '-' + dd;
    }

    // Open modal
    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      trigger.setAttribute('aria-expanded', 'true');
      renderCalendar();
      loadBusyDates();
    }

    // Close modal
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', openModal);
    backdrop.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // Confirm button — tutup modal, isi trigger text
    modalConfirm.addEventListener('click', function() {
      if (!selectedSlot) return;
      hiddenInput.value = selectedSlot;
      triggerText.textContent = selectedLabel;
      trigger.classList.add('jadwal-trigger--filled');
      var errEl = $('err-jadwal');
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      var grp = $('fg-jadwal');
      if (grp) grp.classList.remove('form__group--error');
      closeModal();
    });

    // Load busy dates
    function loadBusyDates() {
      if (!window.MukhaFormService || !window.MukhaFormService.fetchBusyDates) return;
      window.MukhaFormService.fetchBusyDates(toDateStr(today), toDateStr(maxDate)).then(function(dates) {
        busyDates = dates || [];
        renderCalendar();
      });
    }

    // Render calendar grid
    function renderCalendar() {
      calMonthLbl.textContent = MONTHS_ID[curMonth] + ' ' + curYear;
      var firstDay    = new Date(curYear, curMonth, 1).getDay();
      var daysInMonth = new Date(curYear, curMonth+1, 0).getDate();
      var html = '';

      for (var i = 0; i < firstDay; i++) {
        html += '<div class="slot-picker__day slot-picker__day--other" aria-hidden="true"></div>';
      }
      for (var d = 1; d <= daysInMonth; d++) {
        var cellDate = new Date(curYear, curMonth, d);
        cellDate.setHours(0,0,0,0);
        var dateStr   = toDateStr(cellDate);
        var isToday   = cellDate.getTime() === today.getTime();
        var isPast    = cellDate < today;
        var isFuture  = cellDate > maxDate;
        var isFull    = busyDates.indexOf(dateStr) !== -1;
        var isSel     = selectedDate === dateStr;
        var isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

        var cls = 'slot-picker__day';
        if (isToday)  cls += ' slot-picker__day--today';
        if (isPast || isFuture || isWeekend) cls += ' slot-picker__day--past';
        if (isFull)   cls += ' slot-picker__day--full';
        if (isSel)    cls += ' slot-picker__day--selected';

        var disabled = (isPast || isFuture || isFull || isWeekend) ? ' disabled' : '';
        html += '<button type="button" class="' + cls + '"' + disabled +
                ' data-date="' + dateStr + '">' + d + '</button>';
      }
      calGrid.innerHTML = html;

      Array.prototype.slice.call(
        calGrid.querySelectorAll('.slot-picker__day:not([disabled]):not(.slot-picker__day--other)')
      ).forEach(function(btn) {
        btn.addEventListener('click', function() { selectDate(btn.getAttribute('data-date')); });
      });

      var firstOfMonth = new Date(curYear, curMonth, 1);
      calPrev.disabled = firstOfMonth <= today;
      calNext.disabled = new Date(curYear, curMonth+1, 1) > maxDate;
    }

    // Select a date — load slots
    function selectDate(dateStr) {
      selectedDate  = dateStr;
      selectedSlot  = null;
      selectedLabel = null;
      hiddenInput.value = '';
      calSelected.hidden = true;
      modalConfirm.disabled = true;

      Array.prototype.slice.call(document.querySelectorAll('.slot-picker__day')).forEach(function(b) {
        b.classList.toggle('slot-picker__day--selected', b.getAttribute('data-date') === dateStr);
      });

      var parts = dateStr.split('-');
      calSlotsLbl.textContent = 'Slot tersedia — ' + parseInt(parts[2]) + ' ' + MONTHS_ID[parseInt(parts[1])-1] + ' ' + parts[0];
      calSlots.hidden = false;
      calNoAvail.hidden = true;
      calLoading.hidden = false;
      calSlotSel.innerHTML = '<option value="">-- Pilih jam --</option>';
      calSlotSel.hidden = true;

      if (slotsCache[dateStr]) { renderSlotDropdown(slotsCache[dateStr]); return; }
      if (window.MukhaFormService && window.MukhaFormService.fetchSlots) {
        window.MukhaFormService.fetchSlots(dateStr).then(function(slots) {
          slotsCache[dateStr] = slots;
          renderSlotDropdown(slots);
        });
      } else {
        calLoading.hidden = true;
        renderSlotDropdown([]);
      }
    }

    // Populate slot dropdown — slot booked tidak bisa dipilih
    function renderSlotDropdown(slots) {
      calLoading.hidden = true;
      if (!slots || slots.length === 0) {
        var fallbackHours = [9,10,11,13,14,15,16];
        slots = fallbackHours.map(function(h) {
          var parts = selectedDate.split('-');
          var dt = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), h, 0, 0);
          return {
            isoTime: dt.toISOString(),
            label: String(h).padStart(2,'0') + '.00 \u2013 ' + String(h+1).padStart(2,'0') + '.00',
            status: 'available'
          };
        });
      }
      var available = slots.filter(function(s) { return s.status === 'available'; });
      if (available.length === 0) {
        calNoAvail.hidden = false;
        return;
      }
      calSlotSel.innerHTML = '<option value="">-- Pilih jam --</option>';
      slots.forEach(function(slot) {
        var opt = document.createElement('option');
        opt.value = slot.isoTime;
        // Slot booked: label dengan keterangan, disabled
        opt.textContent = slot.label + (slot.status === 'booked' ? ' \u2014 Penuh' : '');
        opt.disabled = slot.status === 'booked';
        calSlotSel.appendChild(opt);
      });
      calSlotSel.hidden = false;
    }

    // Slot dropdown change
    calSlotSel.addEventListener('change', function() {
      var isoTime = calSlotSel.value;
      if (!isoTime) {
        selectedSlot = null;
        calSelected.hidden = true;
        modalConfirm.disabled = true;
        return;
      }
      var parts = selectedDate.split('-');
      var timeLabel = calSlotSel.options[calSlotSel.selectedIndex].textContent;
      selectedSlot  = isoTime;
      selectedLabel = parseInt(parts[2]) + ' ' + MONTHS_ID[parseInt(parts[1])-1] + ' ' + parts[0] + '  \u00b7  ' + timeLabel;
      calSelLbl.textContent = selectedLabel;
      calSelected.hidden = false;
      modalConfirm.disabled = false;
    });

    // Month navigation
    calPrev.addEventListener('click', function() {
      curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderCalendar();
    });
    calNext.addEventListener('click', function() {
      curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderCalendar();
    });
  })();


  /* ── 16 · FORM ─────────────────────────────────────── */
  var form      = $('consult-form');
  var submitBtn = $('form-submit-btn');
  var netErr    = $('form-net-error');
  var netErrMsg = $('form-net-error-msg');
  var FIDS = ['f-name', 'f-wa', 'f-lokasi', 'f-tujuan', 'f-luas', 'f-jadwal'];

  function showFErr(id, msg) {
    var el  = document.getElementById(id);
    var err = document.getElementById('err-' + id.replace('f-', ''));
    var grp = el && el.closest('.form__group');
    if (el)  el.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = msg; err.hidden = false; }
    if (grp) grp.classList.add('form__group--error');
  }
  function clearFErr(id) {
    var el  = document.getElementById(id);
    var err = document.getElementById('err-' + id.replace('f-', ''));
    var grp = el && el.closest('.form__group');
    if (el)  el.removeAttribute('aria-invalid');
    if (err) { err.textContent = ''; err.hidden = true; }
    if (grp) grp.classList.remove('form__group--error');
  }
  function clearAll() {
    FIDS.forEach(function (id) { clearFErr(id); });
    if (netErr) netErr.hidden = true;
  }

  FIDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input',  function () { clearFErr(id); });
      el.addEventListener('change', function () { clearFErr(id); });
    }
  });

  function setLoad(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-disabled', String(on));
    var lbl = submitBtn.querySelector('.btn-label');
    var spn = submitBtn.querySelector('.btn-spinner');
    var arr = submitBtn.querySelector('.btn-arrow');
    if (lbl) lbl.textContent = on ? 'Sending…' : 'Konfirmasi Jadwal Konsultasi';
    if (spn) spn.hidden = !on;
    if (arr) arr.hidden  = on;
    if (form) form.setAttribute('data-submitting', String(on));
  }

  if (form && submitBtn) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.getAttribute('data-submitting') === 'true') return;
      clearAll();

      var raw = {
        nama_lengkap:      (document.getElementById('f-name')   || {value:''}).value,
        nomor_whatsapp:    (document.getElementById('f-wa')     || {value:''}).value,
        lokasi_properti:   (document.getElementById('f-lokasi') || {value:''}).value,
        tujuan_utama:      (document.getElementById('f-tujuan') || {value:''}).value,
        estimasi_luas:     (document.getElementById('f-luas')   || {value:''}).value,
        preferensi_jadwal: (document.getElementById('f-jadwal') || {value:''}).value,
      };

      setLoad(true);
      window.MukhaFormService.submitConsultation(raw).then(function (result) {
        setLoad(false);
        if (result.ok) {
          openTY(raw.nama_lengkap.trim().split(' ')[0]);
          form.reset(); clearAll();
        } else if (result.fieldErrors) {
          var keys = Object.keys(result.fieldErrors);
          keys.forEach(function (k) { showFErr(k, result.fieldErrors[k]); });
          var ff = document.getElementById(keys[0]); if (ff) ff.focus();
        } else {
          if (netErr && netErrMsg) { netErrMsg.textContent = result.error || 'Pengiriman gagal.'; netErr.hidden = false; }
        }
      }).catch(function () {
        setLoad(false);
        if (netErr && netErrMsg) { netErrMsg.textContent = 'Terjadi kesalahan. Silakan coba lagi.'; netErr.hidden = false; }
      });
    });
  }

  /* ── 16 · THANK YOU MODAL ──────────────────────────── */
  var tyModal = $('thankyou-modal');
  var tyClose = $('ty-close');
  var tyName  = $('ty-name');
  var tyPrev  = null;

  function openTY(name) {
    if (!tyModal) return;
    if (tyName && name) tyName.textContent = 'Terima kasih, ' + name + '.';
    tyModal.hidden = false;
    document.body.classList.add('modal-open');
    tyPrev = document.activeElement;
    document.addEventListener('keydown', onTYKey);
    requestAnimationFrame(function () { if (tyClose) tyClose.focus(); });
  }
  function closeTY() {
    if (!tyModal) return;
    tyModal.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onTYKey);
    if (tyPrev) tyPrev.focus();
  }
  function onTYKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeTY(); } }
  if (tyClose) tyClose.addEventListener('click', closeTY);
  if (tyModal) tyModal.addEventListener('click', function (e) { if (e.target === tyModal) closeTY(); });

  /* ── 17 · PRIVACY MODAL ────────────────────────────── */
  var ppModal    = $('privacy-modal');
  var ppCloseX   = $('pp-close');
  var ppCloseBtn = $('pp-understand');
  var ppTrigger  = $('privacy-trigger');
  var fpTrigger  = $('footer-privacy-trigger');
  var ppPrev = null, ppKey = null;

  function openPP() {
    if (!ppModal) return;
    ppPrev = document.activeElement;
    ppModal.hidden = false;
    document.body.classList.add('modal-open');
    ppKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); closePP(); } };
    document.addEventListener('keydown', ppKey);
    requestAnimationFrame(function () { if (ppCloseX) ppCloseX.focus(); });
  }
  function closePP() {
    if (!ppModal) return;
    ppModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (ppKey) document.removeEventListener('keydown', ppKey);
    if (ppPrev) ppPrev.focus();
  }
  if (ppTrigger)  ppTrigger.addEventListener('click',  openPP);
  if (fpTrigger)  fpTrigger.addEventListener('click',  openPP);
  if (ppCloseX)   ppCloseX.addEventListener('click',   closePP);
  if (ppCloseBtn) ppCloseBtn.addEventListener('click',  closePP);
  if (ppModal)    ppModal.addEventListener('click', function (e) { if (e.target === ppModal) closePP(); });

  /* ── 18 · MATRIX CARDS — SCROLL-TRIGGERED AUTO-EXPAND ON MOBILE ── */
  var mCards = $$('.matrix__card');
  var mScrollTick = false;
  
  function updateMatrixCards() {
    if (window.innerWidth >= 768) return; // Desktop only uses hover
    
    var viewportCenter = window.innerHeight / 2;
    var closestCard = null;
    var minDistance = Infinity;
    
    // Find the card closest to viewport center
    mCards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenter = rect.top + (rect.height / 2);
      var distance = Math.abs(cardCenter - viewportCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCard = card;
      }
    });
    
    // Activate only the closest card (within 120px of center)
    mCards.forEach(function (card) {
      if (card === closestCard && minDistance < 120) {
        card.classList.add('matrix__card--active');
      } else {
        card.classList.remove('matrix__card--active');
      }
    });
    
    mScrollTick = false;
  }
  
  // Throttled scroll handler for mobile
  if (window.innerWidth < 768) {
    window.addEventListener('scroll', function () {
      if (mScrollTick) return;
      mScrollTick = true;
      requestAnimationFrame(updateMatrixCards);
    }, { passive: true });
    
    // Initial check on load
    setTimeout(updateMatrixCards, 500);
  }
  
  // Desktop: allow click to toggle (fallback)
  if (window.matchMedia('(hover:hover)').matches) {
    mCards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        // Desktop uses :hover, no toggle needed
      });
    });
  }

  /* ── 19 · SMOOTH SCROLL ────────────────────────────── */
  var NAV_H = 76;
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var hash   = a.getAttribute('href');
      var target = hash === '#top' ? document.body : document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var top = hash === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - NAV_H;
      window.scrollTo({ top: top, behavior: 'smooth' });
      closeMob();
    });
  });

})();
