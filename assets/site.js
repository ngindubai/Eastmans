/* ---------------------------------------------------------------------------
   Eastmans Developments - deployment configuration.

   Every value below is intentionally null/empty until the real identifier is
   supplied. Nothing is emitted into the page while a value is null, so no
   fake or placeholder tags reach production.

     FORM_ENDPOINT  URL that will receive enquiry submissions (POST, JSON).
                    While null the enquiry form stays visibly disabled and
                    cannot submit. Set it and the form wires itself up.
     GA4_ID         e.g. "G-XXXXXXXXXX". While null no analytics is loaded.
     GSC_TOKEN      Google Search Console verification token (the value of the
                    google-site-verification meta tag). While null no tag is
                    written.
   --------------------------------------------------------------------------- */
window.EASTMANS_CONFIG = window.EASTMANS_CONFIG || {
  FORM_ENDPOINT: null,
  GA4_ID: null,
  GSC_TOKEN: null
};

/* Eastmans Developments - scroll & canvas engine.
   Vanilla ES2018. No framework, no CDN, no runtime compilation.
   The page is fully rendered in HTML before this file executes; everything
   here is progressive enhancement (decorative canvas, scroll choreography). */
(function () {
  'use strict';
  if (!document.getElementById('sx-cv')) return;

  var SX = function () {
    this.navOpen = false;
    this.dead = false;
  };

  SX.prototype.setNav = function (open) {
    this.navOpen = open;
    var ovl = document.getElementById('sx-ovl');
    if (!ovl) return;
    ovl.hidden = !open;
    ovl.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    var opener = document.getElementById('sx-navopen');
    if (opener) opener.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  SX.prototype.showErrors = function (errs) {
    var map = { name: 'sx-e-name', email: 'sx-e-email', reason: 'sx-e-reason', message: 'sx-e-msg' };
    for (var k in map) {
      var el = document.getElementById(map[k]);
      if (el) el.textContent = errs[k] || '';
    }
  };


  SX.prototype.CH = [
    { n: '01', label: 'Introduction', d: '0.05s' },
    { n: '02', label: 'Experience', d: '0.1s' },
    { n: '03', label: 'Sourcing', d: '0.15s' },
    { n: '04', label: 'Development', d: '0.2s' },
    { n: '05', label: 'Delivery', d: '0.25s' },
    { n: '06', label: 'Investment', d: '0.3s' },
    { n: '07', label: 'Contact', d: '0.35s' }
  ];
  SX.prototype.LOCS = [
    { x: .36, y: .16 }, { x: .47, y: .40 }, { x: .15, y: .52 },
    { x: .51, y: .74 }, { x: .75, y: .24 }, { x: .68, y: .64 }
  ];


  // ---------- helpers ----------
  SX.prototype.clamp = function(v, a, b) { return v < a ? a : v > b ? b : v; }
  SX.prototype.ramp = function(v, a, b) { return this.clamp((v - a) / (b - a), 0, 1); }
  SX.prototype.eio = function(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  SX.prototype.eo = function(t) { return 1 - Math.pow(1 - t, 3); }
  SX.prototype.dot = function(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  SX.prototype.cross = function(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  SX.prototype.norm = function(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  SX.prototype.boot = function() {
    const $ = id => document.getElementById(id);
    this.$ = $;
    this.RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.fine = matchMedia('(pointer: fine)').matches;
    this.k = {
      smooth: 0.1,
      li: 1,
      grain: true,
      ann: true
    };
    this.cv = $('sx-cv'); this.cx = this.cv.getContext('2d');
    this.cur = scrollY; this.idle = 0;
    this.phase = 'live';
    this.introT0 = performance.now(); this.introP = this.RM ? 1 : 0; this.introDone = this.RM;
    this.buildModel(); this.buildMap();
    this.prepLogo(); this.prepReveals(); this.prepFades(); this.prepCursor(); this.makeGrain();
    this.locEls = [...document.querySelectorAll('[data-loc]')];
    this.onResize = () => { this.measure(); };
    this.onScroll = () => { this.idle = 0; };
    this.onKey = e => { if (e.key === 'Escape' && this.navOpen) this.closeNav(); };
    addEventListener('resize', this.onResize);
    addEventListener('scroll', this.onScroll, { passive: true });
    addEventListener('keydown', this.onKey);
    this.measure();
    // The opening sequence runs only when the plate actually went up before
    // paint, motion is welcome, and the hero lockup is on screen for the map
    // to morph into (it is suppressed on very small or very short viewports).
    if (document.documentElement.classList.contains('booting') && !this.RM && this.lockSz && this.lockSz.w > 4) {
      this.phase = 'load';
      this.preload();
    } else {
      document.documentElement.classList.remove('booting');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!this.dead) this.measure(); });
    setTimeout(() => { if (!this.dead) this.measure(); }, 900);
    // dev hook: deterministic jumps for screenshots
    window.__sxSet = y => { this.finish(); window.scrollTo(0, y); this.cur = y; this.idle = 0; this.introP = 1; this.introDone = true; this.tickOnce(); };
    window.__sxV = 8;
    window.__sxDbg = () => ({ v: 8, act: this.act, vw: this.vw, vh: this.vh, innerW: innerWidth, innerH: innerHeight, dpr: this.dpr, y: Math.round(scrollY), cur: Math.round(this.cur), s6: this.secs && +this.sp(5).toFixed(2), top7: this.secs && this.secs[6] && this.secs[6].top });
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  SX.prototype.measure = function() {
    this.vw = innerWidth; this.vh = innerHeight;
    this.mob = this.vw < 760;
    this.dpr = Math.min(devicePixelRatio || 1, this.mob ? 1 : 1.5); // mobile: 1x backing store
    this.cv.width = Math.round(this.vw * this.dpr); this.cv.height = Math.round(this.vh * this.dpr);
    // canvas is a replaced element: inset:0 does NOT stretch it, so pin the
    // CSS box to the viewport or the backing store renders dpr-times too big
    // on high-DPI screens and every canvas drawing lands misaligned
    this.cv.style.width = this.vw + 'px'; this.cv.style.height = this.vh + 'px';
    const secEls = [...document.querySelectorAll('main > section')];
    // Section heights come from CSS (art-directed per breakpoint); JS only reads them.
    this.secs = secEls.map(s => ({ top: s.offsetTop, h: s.offsetHeight }));
    this.docH = Math.max(1, document.documentElement.scrollHeight - this.vh);
    const rail = this.$('sx-rail');
    if (rail) { rail.style.display = this.mob ? 'none' : 'block'; this.railH = rail.offsetHeight; }
    document.querySelectorAll('[data-desk]').forEach(el => { el.style.display = this.mob ? 'none' : ''; });
    // cache layout sizes once (avoid per-frame getBoundingClientRect / Safari jank)
    const lockv = this.$('sx-lockv');
    if (lockv) { const r = lockv.getBoundingClientRect(); this.lockSz = { w: r.width, h: r.height }; }
    const elh = this.$('sx-elh');
    if (elh) { const r = elh.getBoundingClientRect(); this.elSz = { w: r.width, h: r.height }; }
    this._elev = null; this._mapSegs = null; this._fsrc = null; this._street = null; this.finR = null;
    this.idle = 0;
  }

  SX.prototype.sp = function(i) {
    const s = this.secs[i]; if (!s) return 0;
    const d = Math.max(1, s.h - this.vh);
    return this.clamp((this.cur - s.top) / d, 0, 1);
  }

  // ---------- one-time prep ----------
  SX.prototype.prepLogo = function() {
    this.strokes = [...document.querySelectorAll('#sx-lockv [data-st]')].map(el => {
      let len = 300; try { len = el.getTotalLength(); } catch (e) { }
      const o = +el.getAttribute('data-o');
      return { el, len, s: 0.02 + o * 0.03, d: 0.1 };
    });
    this.gg = this.$('sx-gg'); this.devs = this.$('sx-devs');
    if (!this.gg || !this.devs) return;
    if (!this.RM) {
      this.strokes.forEach(s => { s.el.style.strokeDasharray = s.len + ' ' + s.len; s.el.style.strokeDashoffset = s.len; });
      this.devs.style.opacity = 0;
    } else {
      this.$('sx-el').style.opacity = 1;
    }
  }

  SX.prototype.prepReveals = function() {
    this.rvs = [...document.querySelectorAll('[data-rv]')].map(el => ({
      el,
      sec: el.hasAttribute('data-rv-sec') ? +el.getAttribute('data-rv-sec') : -1,
      at: +(el.getAttribute('data-rv-at') || 0),
      on: false
    }));
    if (!this.RM) this.rvs.forEach(r => { r.el.style.transform = 'translateY(115%)'; });
    else this.rvs.forEach(r => { r.on = true; });
    // viewport reveals: observer instead of per-frame getBoundingClientRect
    if (!this.RM && 'IntersectionObserver' in window) {
      this.rvIO = new IntersectionObserver(entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const r = this.rvs.find(x => x.el.parentElement === e.target);
          if (r && !r.on) this.reveal(r);
          this.rvIO.unobserve(e.target);
        }
      }, { rootMargin: '0px 0px -12% 0px' });
      this.rvs.forEach(r => { if (r.sec < 0 && r.el.parentElement) this.rvIO.observe(r.el.parentElement); });
    }
  }

  SX.prototype.reveal = function(r) {
    r.on = true;
    r.el.style.transition = 'transform 1.1s cubic-bezier(.16,1,.3,1)';
    r.el.style.transform = 'translateY(0)';
  }

  SX.prototype.prepFades = function() {
    if (this.RM) {           // static, fully readable: CSS owns visibility
      this.fds = [];
      return;
    }
    this.fds = [...document.querySelectorAll('[data-fd]')].map(el => ({
      el,
      sec: +el.getAttribute('data-fd-sec'),
      i: +el.getAttribute('data-fd-in'),
      o: +(el.getAttribute('data-fd-out') || 9),
      ann: el.hasAttribute('data-ann')
    }));
  }

  SX.prototype.prepCursor = function() {
    if (!this.fine || this.RM) return;
    this.curOn = true;
    document.documentElement.style.cursor = 'none';
    this.cd = this.$('sx-cd');
    if (!this.cd) { this.curOn = false; document.documentElement.style.cursor = ''; return; }
    this.cd.style.display = 'block';
    this.mx = innerWidth / 2; this.my = innerHeight / 2;
    this.lastMove = 0;
    this.onMove = e => { this.mx = e.clientX; this.my = e.clientY; this.lastMove = performance.now(); this.idle = 0; };
    this.onOver = e => {
      const t = e.target;
      this.curHide = !!(t.closest && t.closest('input,textarea,select'));
    };
    addEventListener('mousemove', this.onMove);
    addEventListener('mouseover', this.onOver);
    this.setNoCursor();
  }
  SX.prototype.setNoCursor = function() {
    if (this.curOn) document.querySelectorAll('a,button,label,select').forEach(el => { el.style.cursor = 'none'; });
  }

  SX.prototype.makeGrain = function() {
    if (!this.k.grain) return;
    const g = document.createElement('canvas'); g.width = g.height = 120;
    const gx = g.getContext('2d'); const id = gx.createImageData(120, 120);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gx.putImageData(id, 0, 0);
    const el = this.$('sx-grain');
    el.style.backgroundImage = 'url(' + g.toDataURL() + ')';
    el.style.backgroundSize = '120px 120px';
    el.style.mixBlendMode = 'screen';
    el.style.opacity = 0.05;
  }

  // ---------- geometry ----------
  SX.prototype.buildModel = function() {
    const parts = [];
    const mk = (tag, base) => { const p = { tag, v: [], e: [], q: [], off: [0, 0, 0], alpha: 0, fill: 0, drawP: 1, ext: 0, white: 0, edgeA: .5, base }; parts.push(p); return p; };
    const box = (p, x, y, z, w, h, d, tone) => {
      const b = p.v.length;
      p.v.push([x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d], [x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]);
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(e => p.e.push([b + e[0], b + e[1]]));
      const A = i => b + i;
      [[[4, 5, 6, 7], [0, 1, 0]], [[0, 1, 5, 4], [0, 0, -1]], [[3, 2, 6, 7], [0, 0, 1]], [[0, 3, 7, 4], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]], [[0, 1, 2, 3], [0, -1, 0]]].forEach(f => p.q.push({ i: f[0].map(A), n: f[1], b: tone }));
    };
    const edge = (p, a, b) => { const i = p.v.length; p.v.push(a, b); p.e.push([i, i + 1]); };
    const rectZ = (p, cx, y0, y1, w, z) => {
      edge(p, [cx - w / 2, y0, z], [cx + w / 2, y0, z]); edge(p, [cx + w / 2, y0, z], [cx + w / 2, y1, z]);
      edge(p, [cx + w / 2, y1, z], [cx - w / 2, y1, z]); edge(p, [cx - w / 2, y1, z], [cx - w / 2, y0, z]);
    };
    const win = (p, cx, y0, y1, w, z) => { // sash: outer + frame + glazing bar + sill
      rectZ(p, cx, y0, y1, w, z);
      rectZ(p, cx, y0 + .09, y1 - .09, w - .18, z);
      edge(p, [cx - w / 2 + .09, (y0 + y1) / 2, z], [cx + w / 2 - .09, (y0 + y1) / 2, z]);
      edge(p, [cx - w / 2 - .14, y0 - .07, z], [cx + w / 2 + .14, y0 - .07, z]);
    };
    // Victorian terrace: 4 houses, raised ground floor, canted bays, parapet + slate pitch
    const N = 4, HW = 4.6, X0 = -9.2, F = 3.5, PL = .55, G1 = 3.6, G2 = 6.5, CN = 9.2;
    const exist = mk('exist', .52);
    for (let i = 0; i < N; i++) box(exist, X0 + i * HW, 0, -F, HW, CN, F * 2, i % 2 ? 1.14 : 1);
    box(exist, X0, 0, -F - .02, N * HW, PL, F * 2 + .1, 1.2);          // plinth
    box(exist, X0, CN, -F - .14, N * HW, .3, .44, 1.3);                // cornice
    box(exist, X0, CN + .3, -F - .06, N * HW, .4, .3, 1.05);           // parapet
    [G1, G2].forEach(yv => edge(exist, [X0, yv, F + .01], [X0 + N * HW, yv, F + .01])); // string courses
    for (let i = 0; i < N; i++) {
      const xc = X0 + i * HW + HW / 2, bx = xc - .85, dx = xc + 1.32;
      win(exist, bx - .62, G1 + .55, G2 - .45, 1.06, F); win(exist, bx + .62, G1 + .55, G2 - .45, 1.06, F);
      win(exist, dx, G1 + .55, G2 - .45, .95, F);
      win(exist, bx - .62, G2 + .4, CN - .55, .96, F); win(exist, bx + .62, G2 + .4, CN - .55, .96, F);
      win(exist, dx, G2 + .4, CN - .55, .88, F);
      rectZ(exist, dx, PL, 2.95, 1.0, F); rectZ(exist, dx, PL + .1, 2.5, .82, F); // door
      rectZ(exist, dx, 2.58, 2.92, .82, F);                                       // fanlight
      edge(exist, [dx - .68, PL, F], [dx - .68, 3.12, F]); edge(exist, [dx + .68, PL, F], [dx + .68, 3.12, F]);
      edge(exist, [dx - .8, 3.12, F], [dx + .8, 3.12, F]); edge(exist, [dx - .8, 3.3, F], [dx + .8, 3.3, F]);
      box(exist, dx - .55, 0, F + .02, 1.1, .26, .6, 1.25);                       // entrance step
      const RZ = F + 1.9, x0 = X0 + i * HW + .12, x1 = X0 + (i + 1) * HW - .12, gL = dx - .62, gR = dx + .62;
      [[x0, gL], [gR, x1]].forEach(sg => { // railings with gate gap
        if (sg[1] <= sg[0]) return;
        [.32, .92].forEach(yv => edge(exist, [sg[0], yv, RZ], [sg[1], yv, RZ]));
        const np = Math.max(2, Math.round((sg[1] - sg[0]) / .56));
        for (let k = 0; k <= np; k++) { const xx = sg[0] + (sg[1] - sg[0]) * k / np; edge(exist, [xx, 0, RZ], [xx, .92, RZ]); }
      });
      edge(exist, [x0, PL, F], [x0, CN, F]); // party-wall line at house start
    }
    edge(exist, [X0 + N * HW - .12, PL, F], [X0 + N * HW - .12, CN, F]);
    const roof = mk('roof', .58);
    { // slate pitch behind parapet + stacks with pots on party walls
      const b = roof.v.length, R = 11.5, zA = -3.3, zB = 3.0, W = N * HW;
      roof.v.push([X0 + .1, 9.4, zA], [X0 + .1, 9.4, zB], [X0 + .1, R, -.2], [X0 + W - .1, 9.4, zA], [X0 + W - .1, 9.4, zB], [X0 + W - .1, R, -.2]);
      roof.e.push([b, b + 2], [b + 1, b + 2], [b + 3, b + 5], [b + 4, b + 5], [b + 2, b + 5], [b, b + 3], [b + 1, b + 4]);
      const n1 = Math.hypot(R - 9.4, zB + .2), n2 = Math.hypot(R - 9.4, -.2 - zA);
      roof.q.push(
        { i: [b + 1, b + 2, b + 5, b + 4], n: [0, (zB + .2) / n1, (R - 9.4) / n1] },
        { i: [b, b + 2, b + 5, b + 3], n: [0, (-.2 - zA) / n2, -(R - 9.4) / n2] },
        { i: [b, b + 1, b + 2, b + 2], n: [-1, 0, 0] },
        { i: [b + 3, b + 4, b + 5, b + 5], n: [1, 0, 0] }
      );
      for (let i = 0; i <= N; i++) {
        // end stacks sit flush inside the gable walls; bases end on the roof plane (no loft lines)
        const x = i === 0 ? X0 + .57 : i === N ? X0 + N * HW - .57 : X0 + i * HW;
        box(roof, x - .55, 11.05, -1.0, 1.1, 2.0, 1.9, 1.1);
        box(roof, x - .34, 13.05, -.62, .3, .58, .3, 1.25); box(roof, x + .04, 13.05, -.62, .3, .58, .3, 1.25);
        box(roof, x - .34, 13.05, .28, .3, .58, .3, 1.25); box(roof, x + .04, 13.05, .28, .3, .58, .3, 1.25);
      }
    }
    const nu = mk('new1', .66); box(nu, -4.6, 9.55, -2.9, 9.2, 2.1, 4.4); // set-back roof-level addition
    const core = mk('core', .74); box(core, X0, 0, -F - 3.1, HW * 2, 3.5, 3.1); // rear extension
    const fins = mk('fins', .6);
    for (let i = 0; i < N; i++) { // canted ground-floor bays
      const xc = X0 + i * HW + HW / 2, bx = xc - .85, y0 = PL, y1 = G1 - .15;
      const P0 = [bx - 1.42, 0, F], P1 = [bx - .82, 0, F + .95], P2 = [bx + .82, 0, F + .95], P3 = [bx + 1.42, 0, F];
      const b = fins.v.length;
      [P0, P1, P2, P3].forEach(pt => fins.v.push([pt[0], y0, pt[2]]));
      [P0, P1, P2, P3].forEach(pt => fins.v.push([pt[0], y1, pt[2]]));
      fins.e.push([b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7], [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b, b + 1], [b + 1, b + 2], [b + 2, b + 3]);
      const qn = (pA, pB) => { const dx2 = pB[0] - pA[0], dz = pB[2] - pA[2], l = Math.hypot(dz, dx2) || 1; return [dz / l, 0, -dx2 / l]; };
      fins.q.push(
        { i: [b, b + 1, b + 5, b + 4], n: qn(P1, P0) },
        { i: [b + 1, b + 2, b + 6, b + 5], n: [0, 0, 1] },
        { i: [b + 2, b + 3, b + 7, b + 6], n: qn(P3, P2) }
      );
      box(fins, bx - 1.5, y1, F - .08, 3.0, .22, 1.14, 1.3); // bay cap cornice
      win(fins, bx, y0 + .35, y1 - .3, 1.1, F + .955);
      const cheek = (pA, pB) => { // window on angled bay cheek
        const t1 = .3, t2 = .78, yA = y0 + .35, yB = y1 - .3;
        const ix = t => pA[0] + (pB[0] - pA[0]) * t, iz = t => pA[2] + (pB[2] - pA[2]) * t;
        edge(fins, [ix(t1), yA, iz(t1)], [ix(t2), yA, iz(t2)]);
        edge(fins, [ix(t2), yA, iz(t2)], [ix(t2), yB, iz(t2)]);
        edge(fins, [ix(t2), yB, iz(t2)], [ix(t1), yB, iz(t1)]);
        edge(fins, [ix(t1), yB, iz(t1)], [ix(t1), yA, iz(t1)]);
        edge(fins, [ix(t1), (yA + yB) / 2, iz(t1)], [ix(t2), (yA + yB) / 2, iz(t2)]);
      };
      cheek(P0, P1); cheek(P2, P3);
    }
    const ctxp = mk('ctx', .34);
    box(ctxp, -24, 0, -2, 8, 4.5, 8); box(ctxp, 14, 0, -9, 7, 6, 7); box(ctxp, -21, 0, 10, 9, 3.5, 6);
    box(ctxp, 12, 0, 7, 8, 5, 6); box(ctxp, -6, 0, -22, 10, 5.5, 8); box(ctxp, -20, 0, -14, 7, 4, 7);
    this.parts = {}; parts.forEach(p => this.parts[p.tag] = p); this.plist = parts;
  }

  SX.prototype.buildMap = function() {
    const P = [];
    const lea = []; for (let i = 0; i <= 24; i++) { const t = i / 24; lea.push([.40 + .045 * Math.sin(t * 5.2 + 1.2) + .02 * Math.sin(t * 11), t]); }
    P.push({ pts: lea, a: .5, w: 1.4 });
    P.push({ pts: [[0, .66], [.2, .6], [.42, .55], [.66, .47], [1, .4]], a: .4 });
    P.push({ pts: [[.28, 0], [.38, .28], [.5, .6], [.56, .82], [.6, 1]], a: .4 });
    P.push({ pts: [[0, .3], [.24, .3], [.5, .34], [.78, .3], [1, .26]], a: .3 });
    P.push({ pts: [[.1, 1], [.3, .8], [.52, .72], [.8, .66], [1, .62]], a: .3 });
    P.push({ pts: [[0, .78], [.3, .66], [.62, .52], [1, .44]], a: .35, dash: 1 });
    this.LOCS.forEach((l, j) => {
      const s = (j % 3 - 1) * .012;
      P.push({ pts: [[l.x - .055, l.y + .028 + s], [l.x + .05, l.y - .006 + s]], a: .22 });
      P.push({ pts: [[l.x - .04, l.y + .052 + s], [l.x + .06, l.y + .018 + s]], a: .18 });
      P.push({ pts: [[l.x - .01, l.y - .04], [l.x + .022, l.y + .05]], a: .18 });
    });
    this.mapPolys = P;
    const blob = (cx, cy, r, sd) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2; const rr = r * (1 + .32 * Math.sin(3 * a + sd)); pts.push([cx + Math.cos(a) * rr * .8, cy + Math.sin(a) * rr]); } return { pts, a: .16 }; };
    this.mapBlobs = [blob(.42, .3, .085, 1.4), blob(.45, .62, .065, 4.1)];
  }

  SX.prototype.cam = function(px, py, pz, tx, ty, tz, f) {
    const fw = this.norm([tx - px, ty - py, tz - pz]);
    const rt = this.norm(this.cross(fw, [0, 1, 0]));
    const up = this.cross(rt, fw);
    return { p: [px, py, pz], fw, rt, up, f };
  }
  SX.prototype.proj = function(c, v, off) {
    const x = v[0] + off[0] - c.p[0], y = v[1] + off[1] - c.p[1], z = v[2] + off[2] - c.p[2];
    const cz = x * c.fw[0] + y * c.fw[1] + z * c.fw[2];
    if (cz < .6) return null;
    const cx = x * c.rt[0] + y * c.rt[1] + z * c.rt[2];
    const cy = x * c.up[0] + y * c.up[1] + z * c.up[2];
    const s = (Math.min(this.vh, this.vw * 1.45) * c.f) / cz;
    return [this.vw / 2 + cx * s, this.vh / 2 - cy * s, cz];
  }
  SX.prototype.lineCol = function(a, w01) {
    const t = w01 || 0;
    const r = 167 + (242 - 167) * t, g = 171 + (241 - 171) * t, b = 177 + (237 - 177) * t;
    return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + this.clamp(a * this.k.li, 0, 1) + ')';
  }
  SX.prototype.line = function(x1, y1, x2, y2, a, w01, wd) {
    if (a <= .004) return;
    const c = this.cx;
    c.strokeStyle = this.lineCol(a, w01);
    c.lineWidth = wd || 1;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  SX.prototype.resetParts = function() { this.plist.forEach(p => { p.alpha = 0; p.fill = 0; p.drawP = 1; p.ext = 0; p.white = 0; p.edgeA = .5; p.off = [0, 0, 0]; }); }

  SX.prototype.renderModel = function(c, gA) {
    const L = this.norm([-.45, .85, -.28]);
    const items = [];
    for (const p of this.plist) {
      if (p.alpha <= .01) continue;
      p.pv = p.v.map(v => this.proj(c, v, p.off));
      if (p.fill > .01) for (const q of p.q) {
        const pts = q.i.map(i => p.pv[i]);
        if (pts.some(x => !x)) continue;
        const z = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
        items.push({ t: 1, z, pts, sh: Math.max(0, this.dot(q.n, L)), p, b: q.b || 1 });
      }
      if (p.drawP > 0) {
        const n = p.e.length;
        for (let i = 0; i < n; i++) {
          const f = this.clamp(p.drawP * 1.9 - (i / n) * .9, 0, 1);
          if (f <= 0) continue;
          const a = p.pv[p.e[i][0]], b = p.pv[p.e[i][1]];
          if (!a || !b) continue;
          // small z bias so coplanar facade detail draws over its host face
          items.push({ t: 0, z: (a[2] + b[2]) / 2 - 1.1, a, b2: b, f, p });
        }
      }
    }
    items.sort((x, y) => y.z - x.z);
    for (const it of items) {
      if (it.t === 1) {
        const v = (.3 + .7 * it.sh) * it.p.base * it.b;
        const col = 'rgba(' + (10 + v * 96 | 0) + ',' + (11 + v * 100 | 0) + ',' + (13 + v * 110 | 0) + ',' + this.clamp(it.p.fill * it.p.alpha * gA, 0, 1) + ')';
        this.cx.fillStyle = col;
        this.cx.beginPath();
        it.pts.forEach((pt, i) => i ? this.cx.lineTo(pt[0], pt[1]) : this.cx.moveTo(pt[0], pt[1]));
        this.cx.closePath(); this.cx.fill();
        this.cx.strokeStyle = col; this.cx.lineWidth = .8; this.cx.stroke(); // seal AA seams
      } else {
        const a = it.a, b = it.b2, p = it.p;
        const x2 = a[0] + (b[0] - a[0]) * it.f, y2 = a[1] + (b[1] - a[1]) * it.f;
        this.line(a[0], a[1], x2, y2, p.edgeA * p.alpha * gA, p.white);
        if (p.ext > 0 && it.f > .95) {
          const dx = b[0] - a[0], dy = b[1] - a[1];
          if (Math.hypot(dx, dy) > 60) this.line(a[0] - dx * p.ext, a[1] - dy * p.ext, b[0] + dx * p.ext, b[1] + dy * p.ext, .09 * p.alpha * gA);
        }
      }
    }
  }

  SX.prototype.groundGrid = function(c, a, gA) {
    if (a <= .005) return;
    for (let g = -30; g <= 30; g += 6) {
      const p1 = this.proj(c, [g, 0, -30], [0, 0, 0]), p2 = this.proj(c, [g, 0, 30], [0, 0, 0]);
      if (p1 && p2) this.line(p1[0], p1[1], p2[0], p2[1], a * gA);
      const p3 = this.proj(c, [-30, 0, g], [0, 0, 0]), p4 = this.proj(c, [30, 0, g], [0, 0, 0]);
      if (p3 && p4) this.line(p3[0], p3[1], p4[0], p4[1], a * gA);
    }
  }

  SX.prototype.mapRect = function(full) {
    if (full || this.mob) return { x: this.vw * .07, y: this.vh * .1, w: this.vw * .86, h: this.vh * .76 };
    return { x: this.vw * .46, y: this.vh * .08, w: this.vw * .48, h: this.vh * .84 };
  }

  SX.prototype.drawPoly = function(poly, rect, drawP, alpha, drift) {
    const pts = poly.pts, c = this.cx;
    const n = pts.length - 1;
    const lim = Math.max(0, Math.min(1, drawP)) * n;
    if (lim <= 0) return;
    c.strokeStyle = this.lineCol(alpha * poly.a, 0);
    c.lineWidth = poly.w || 1;
    if (poly.dash) c.setLineDash([3, 7]);
    c.beginPath();
    const X = p => rect.x + p[0] * rect.w, Y = p => rect.y + p[1] * rect.h + (drift || 0);
    c.moveTo(X(pts[0]), Y(pts[0]));
    for (let i = 1; i <= Math.floor(lim); i++) c.lineTo(X(pts[i]), Y(pts[i]));
    const fr = lim - Math.floor(lim), i0 = Math.floor(lim);
    if (fr > 0 && i0 < n) {
      const a = pts[i0], b = pts[i0 + 1];
      c.lineTo(X(a) + (X(b) - X(a)) * fr, Y(a) + (Y(b) - Y(a)) * fr);
    }
    c.stroke();
    if (poly.dash) c.setLineDash([]);
  }

  SX.prototype.drawMap = function(rect, drawP, alpha, drift) {
    this.mapBlobs.forEach(b => this.drawPoly(b, rect, drawP, alpha, drift));
    this.mapPolys.forEach((p, i) => {
      const st = this.clamp(drawP * 1.6 - i * .028, 0, 1);
      this.drawPoly(p, rect, st, alpha, drift);
    });
  }

  SX.prototype.mapSegs = function(rect) {
    const key = [rect.x | 0, rect.w | 0].join(',');
    if (this._mapSegs && this._mapSegsKey === key) return this._mapSegs;
    const segs = [];
    const add = (p1, p2, a) => segs.push([rect.x + p1[0] * rect.w, rect.y + p1[1] * rect.h, rect.x + p2[0] * rect.w, rect.y + p2[1] * rect.h, a]);
    this.mapPolys.forEach(p => { for (let i = 0; i < p.pts.length - 1; i += 2) add(p.pts[i], p.pts[Math.min(i + 2, p.pts.length - 1)], p.a); });
    this._mapSegs = segs; this._mapSegsKey = key;
    return segs;
  }

  SX.prototype.elevSegs = function() {
    const key = this.vw + 'x' + this.vh;
    if (this._elev && this._elevKey === key) return this._elev;
    this._elevKey = key;
    const s = Math.min(this.vw * .55, 720) / 24, cx = this.vw / 2, cy = this.vh * .64;
    const segs = [], seen = {};
    ['exist', 'roof', 'new1', 'core', 'fins'].forEach(tag => {
      const p = this.parts[tag];
      p.e.forEach(e => {
        const a = p.v[e[0]], b = p.v[e[1]];
        const x1 = cx + a[0] * s, y1 = cy - a[1] * s, x2 = cx + b[0] * s, y2 = cy - b[1] * s;
        const k = [x1 | 0, y1 | 0, x2 | 0, y2 | 0].join(',');
        if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) < 1) return;
        if (seen[k]) return; seen[k] = 1;
        segs.push([x1, y1, x2, y2, .5]);
      });
    });
    segs.push([cx - 13 * s, cy, cx + 13 * s, cy, .35]);
    this._elev = segs;
    return segs;
  }

  SX.prototype.strokeChains = function(chains, r, sx, sy, alpha) {
    // Stroke each subpath as ONE joined polyline / mitred corners, exact caps
    // and stroke weight, i.e. the SVG's own rendering semantics.
    const c = this.cx, al = this.clamp(alpha * this.k.li, 0, 1);
    c.lineWidth = 3 * sx; c.lineJoin = 'miter'; c.lineCap = 'butt';
    c.miterLimit = 4; // SVG's default stroke-miterlimit / bevel where it bevels
    for (const ch of chains) {
      c.strokeStyle = (ch.grey ? 'rgba(167,171,177,' : 'rgba(242,241,237,') + al + ')';
      c.beginPath();
      if (ch.circle) c.arc(r.left + ch.circle[0] * sx, r.top + ch.circle[1] * sy, ch.circle[2] * sx, 0, 2 * Math.PI);
      else {
        ch.pts.forEach((pt, i) => { const X = r.left + pt[0] * sx, Y = r.top + pt[1] * sy; i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
        if (ch.closed) c.closePath();
      }
      c.stroke();
    }
    c.miterLimit = 10; // restore the canvas default for every other scene
  }

  SX.prototype.lockSegs = function() {
    // Hero wordmark letterforms as morph targets (grid excluded)
    if (!this._lseg) this._lseg = this.svgSegs(this.$('sx-lockv'), '[data-st]');
    return this._lseg;
  }

  SX.prototype.monoSegs = function() {
    if (!this._mseg) this._mseg = this.svgSegs(this.$('sx-finv'), 'path,circle');
    return this._mseg;
  }

  SX.prototype.svgSegs = function(svg, sel) {
    // Morph targets sampled from the REAL SVG paths, in viewBox units / the
    // landed drawing matches the SVG by construction. Compound paths are
    // split into subpaths so endpoints are sampled exactly; ~6-unit chords
    // keep curve deviation under 0.2 device px at render size.
    const segs = [], chains = [];
    const subdiv = (a, b, grey) => { // flight segments: ~6-unit chunks of an edge
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let i = 1; i <= n; i++) {
        segs.push([a[0] + (b[0] - a[0]) * (i - 1) / n, a[1] + (b[1] - a[1]) * (i - 1) / n,
          a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, grey]);
      }
    };
    [...svg.querySelectorAll(sel)].forEach(el => {
      const grey = (el.getAttribute('stroke') || '').toUpperCase().indexOf('A7ABB1') >= 0 ? 1 : 0;
      const d = el.getAttribute('d');
      if (!d) { // circle: exact center/radius; flight bits from chords
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy'), rr = +el.getAttribute('r');
        const n = Math.ceil(2 * Math.PI * rr / 6);
        for (let i = 0; i < n; i++) {
          const a1 = i / n * 2 * Math.PI, a2 = (i + 1) / n * 2 * Math.PI;
          segs.push([cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, cx + Math.cos(a2) * rr, cy + Math.sin(a2) * rr, grey]);
        }
        chains.push({ circle: [cx, cy, rr], grey });
        return;
      }
      d.split(/(?=M)/).forEach(part => {
        if (!part.trim()) return;
        if (!/[^MLZmlz\s\d.-]/.test(part)) {
          // pure M/L polyline: use exact vertices so mitred corners land
          // precisely on the SVG's
          const nums = (part.match(/-?[\d.]+/g) || []).map(Number);
          if (nums.length < 4) return;
          const pts = [];
          for (let i = 0; i < nums.length - 1; i += 2) pts.push([nums[i], nums[i + 1]]);
          for (let i = 1; i < pts.length; i++) subdiv(pts[i - 1], pts[i], grey);
          chains.push({ pts, grey, closed: /z\s*$/i.test(part) });
          return;
        }
        // curved subpath: arc-length sample ~6-unit chords (<0.2 device px
        // deviation at render size)
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        t.setAttribute('d', part); t.setAttribute('fill', 'none'); t.setAttribute('stroke', 'none');
        svg.appendChild(t);
        let len = 0; try { len = t.getTotalLength(); } catch (e) { }
        if (len) {
          const n = Math.max(2, Math.ceil(len / 6));
          const pts = [];
          for (let i = 0; i <= n; i++) { const pt = t.getPointAtLength(len * i / n); pts.push([pt.x, pt.y]); }
          for (let i = 1; i <= n; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], grey]);
          chains.push({ pts, grey, closed: /z\s*$/i.test(part) });
        }
        svg.removeChild(t);
      });
    });
    return { segs, chains };
  }

  // ---------- scenes ----------
  SX.prototype.sceneHeroCanvas = function(t, gA, act) {
    const sz = this.lockSz || { w: 0, h: 0 };
    const r = { left: (this.vw - sz.w) / 2, top: (this.vh - sz.h) / 2, width: sz.w, height: sz.h };
    if (act === 0 && t > 0 && t < 1) {
      const capY = r.top + r.height * (40 / 220), midY = r.top + r.height * (90 / 220), baseY = r.top + r.height * (140 / 220);
      const ext = this.eio(this.ramp(t, 0, .45)), fadeL = 1 - this.ramp(t, .72, 1);
      if (ext > 0) {
        [capY, midY, baseY].forEach(yy => {
          const half = r.width / 2 + this.vw * .6 * ext;
          this.line(this.vw / 2 - half, yy, this.vw / 2 + half, yy, .13 * fadeL * gA);
        });
        const extV = this.eio(this.ramp(t, .12, .55));
        [40, 233, 511, 799, 947, 1140].forEach(fr => {
          const x = r.left + r.width * (fr / 1180);
          this.line(x, capY - this.vh * extV, x, baseY + this.vh * extV, .1 * fadeL * gA);
        });
      }
    }
    const g = this.ramp(t, .38, 1);
    if (g > 0) {
      const c = this.cam(24, 11, 46 - 16 * this.eio(g), 0, 5, 0, .95);
      this.groundGrid(c, .05 * g, gA);
      this.resetParts();
      const ex = this.parts.exist, rf = this.parts.roof;
      ex.alpha = g; ex.drawP = this.ramp(t, .5, 1) * .85; ex.edgeA = .55;
      rf.alpha = g; rf.drawP = this.ramp(t, .62, 1) * .8; rf.edgeA = .5;
      this.renderModel(c, gA);
    }
  }

  SX.prototype.sceneContext = function(p, gA) {
    const A = this.ramp(p, 0, .12) * (1 - this.ramp(p, .88, 1)) * gA;
    if (A <= 0) return;
    const drift = (p - .5) * this.vh * .06;
    const rect = this.mapRect(false);
    this.drawMap(rect, this.ramp(p, .05, .55), .62 * A, drift);
    const crosses = [[.2, .22], [.62, .48], [.38, .78]];
    crosses.forEach((cp, i) => {
      const ca = this.ramp(p, .25 + i * .1, .33 + i * .1) * A;
      const x = rect.x + cp[0] * rect.w, y = rect.y + cp[1] * rect.h + drift;
      this.line(x - 7, y, x + 7, y, .55 * ca); this.line(x, y - 7, x, y + 7, .55 * ca);
    });
  }

  SX.prototype.sceneTransform = function(p, gA) {
    const A = this.ramp(p, 0, .08);
    this.resetParts();
    const P = this.parts;
    const wire = this.ramp(p, .02, .26);
    const lift = this.eio(this.ramp(p, .26, .46)) * (1 - this.eio(this.ramp(p, .7, .88)));
    const newIn = this.eio(this.ramp(p, .46, .68));
    const finsIn = this.eio(this.ramp(p, .54, .74));
    const fills = this.ramp(p, .72, .94);
    P.exist.alpha = A; P.exist.drawP = wire; P.exist.fill = fills * .92; P.exist.edgeA = .55;
    P.roof.alpha = A; P.roof.drawP = this.ramp(p, .08, .32); P.roof.fill = fills * .92; P.roof.off = [0, lift * 6, 0];
    P.new1.alpha = newIn; P.new1.drawP = newIn; P.new1.fill = Math.max(newIn * .3, fills * .95); P.new1.off = [0, (1 - newIn) * 7, 0];
    P.core.alpha = newIn; P.core.drawP = newIn; P.core.fill = Math.max(newIn * .3, fills * .95); P.core.off = [0, (1 - newIn) * 9, 0];
    P.fins.alpha = finsIn; P.fins.drawP = finsIn; P.fins.fill = finsIn * .85; P.fins.edgeA = .4;
    P.ctx.alpha = this.ramp(p, .86, 1) * .55; P.ctx.drawP = this.ramp(p, .86, 1); P.ctx.fill = .22; P.ctx.edgeA = .3;
    const ang = -.5 + this.eio(p) * .7, rr = (34 - 6 * p) * (this.mob ? 1.25 : 1);
    const c = this.cam(Math.sin(ang) * rr, 11, Math.cos(ang) * rr, 0, 5.5, 0, .95);
    this.groundGrid(c, .05 * A, gA);
    if (lift > .02) {
      [3.6, 6.5].forEach(yv => {
        const yy = yv + lift * .6;
        for (let zi = -3.5; zi <= 3.5; zi += 3.5) {
          const p1 = this.proj(c, [-9.2, yy, zi], [0, 0, 0]), p2 = this.proj(c, [9.2, yy, zi], [0, 0, 0]);
          if (p1 && p2) this.line(p1[0], p1[1], p2[0], p2[1], .3 * lift * A * gA);
        }
      });
    }
    this.renderModel(c, gA);
  }

  SX.prototype.scenePrinciples = function(p, gA) {
    this.resetParts();
    const P = this.parts;
    const w0 = 1 - this.ramp(p, .28, .42);
    const w1 = this.ramp(p, .3, .42) * (1 - this.ramp(p, .6, .72));
    const w2 = this.ramp(p, .6, .74);
    ['exist', 'roof', 'new1', 'core', 'fins'].forEach(t => {
      const pt = P[t];
      pt.alpha = 1; pt.drawP = 1;
      pt.fill = .35 + .62 * w2;
      pt.white = w2 * .45;
      pt.edgeA = .42 + .18 * w1;
      pt.ext = .28 * w1;
    });
    P.fins.edgeA = .3;
    P.ctx.alpha = .2 + .7 * w0; P.ctx.drawP = 1; P.ctx.fill = .26 * w0 + .06; P.ctx.edgeA = .3;
    const ang = .2 + this.eio(p) * .95, rr = (28 - 7 * this.eio(p)) * (this.mob ? 1.25 : 1), ht = 11 - 3.5 * p;
    const c = this.cam(Math.sin(ang) * rr, ht, Math.cos(ang) * rr, 0, 5.5, 0, .95);
    this.groundGrid(c, .04 + .04 * w0, gA);
    this.renderModel(c, gA);
  }

  SX.prototype.sceneEast = function(p, gA) {
    const mFade = 1 - this.ramp(p, 0, .12);
    if (mFade > 0) this.scenePrinciples(1, mFade * gA);
    const mapA = this.ramp(p, .05, .18);
    const mapDraw = this.ramp(p, .06, .5);
    const morph = this.eio(this.ramp(p, .52, .8));
    const rect = this.mapRect(true);
    if (morph < 1) this.drawMap(rect, mapDraw, mapA * (1 - morph) * .9 * gA, 0);
    if (morph > 0) {
      const src = this.mapSegs(rect), tgt = this.elevSegs();
      const n = src.length;
      for (let i = 0; i < n; i++) {
        const s = src[i], t = tgt[i % tgt.length];
        const dup = Math.floor(i / tgt.length);
        const ta = dup === 0 ? .55 : Math.max(0, .3 - dup * .12);
        const a = (s[4] + (ta - s[4]) * morph) * gA * this.ramp(p, .52, .6);
        this.line(
          s[0] + (t[0] - s[0]) * morph, s[1] + (t[1] - s[1]) * morph,
          s[2] + (t[2] - s[2]) * morph, s[3] + (t[3] - s[3]) * morph,
          a, morph * .4
        );
      }
      if (n < tgt.length) for (let i = n; i < tgt.length; i++) { // elevation detail beyond map-line count
        const t = tgt[i];
        this.line(t[0], t[1], t[2], t[3], .5 * morph * gA * this.ramp(p, .52, .6), morph * .4);
      }
    }
    const elOp = this.ramp(p, .56, .7);
    if (!this.RM) this.$('sx-el').style.opacity = elOp;
    if (elOp > 0) {
      const sz = this.elSz || { w: 0, h: 0 };
      const r = { left: (this.vw - sz.w) / 2, top: (this.vh - sz.h) / 2, right: (this.vw + sz.w) / 2, bottom: (this.vh + sz.h) / 2, height: sz.h };
      [r.top - 8, r.top + r.height / 2, r.bottom + 8].forEach(yy => this.line(0, yy, this.vw, yy, .14 * elOp * gA));
      [r.left - 12, r.right + 12].forEach(xx => this.line(xx, r.top - this.vh * .1, xx, r.bottom + this.vh * .1, .12 * elOp * gA));
    }
  }

  SX.prototype.streetSegs = function() {
    // Full street elevation: the 4-house terrace module tiled across the
    // viewport / the drawing the finale breaks into the wordmark.
    const key = this.vw + 'x' + this.vh;
    if (this._street && this._streetKey === key) return this._street;
    this._streetKey = key;
    const M = 18.4, tiles = this.mob ? 2 : 3;
    const s = (this.vw * .92) / (M * tiles), cx = this.vw / 2, cy = this.vh * .56;
    const segs = [], seen = {};
    ['exist', 'roof', 'fins'].forEach(tag => {
      const p = this.parts[tag];
      for (let k = 0; k < tiles; k++) {
        const off = (k - (tiles - 1) / 2) * M;
        p.e.forEach(e => {
          const a = p.v[e[0]], b = p.v[e[1]];
          const x1 = cx + (a[0] + off) * s, y1 = cy + (6.8 - a[1]) * s, x2 = cx + (b[0] + off) * s, y2 = cy + (6.8 - b[1]) * s;
          if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) < 1) return;
          const kk = [x1 | 0, y1 | 0, x2 | 0, y2 | 0].join(',');
          if (seen[kk]) return; seen[kk] = 1;
          segs.push([x1, y1, x2, y2, .5]);
        });
      }
    });
    segs.push([this.vw * .02, cy + 6.8 * s, this.vw * .98, cy + 6.8 * s, .35]); // pavement line
    this._street = segs;
    return this._street;
  }

  SX.prototype.sceneQuiet = function(p, gA) {
    // no fade-out: the street stays whole and hands to sceneFinale, which
    // draws the identical street from the moment section 07 takes the lead
    const a = this.ramp(p, 0, .25) * gA;
    if (a <= 0) return;
    const segs = this.streetSegs(), n = segs.length;
    const dp = this.ramp(p, .02, .55); // the street draws in house by house
    for (let i = 0; i < n; i++) {
      const f = this.clamp(dp * 1.7 - (i / n) * .7, 0, 1);
      if (f <= 0) break;
      const g = segs[i];
      this.line(g[0], g[1], g[0] + (g[2] - g[0]) * f, g[1] + (g[3] - g[1]) * f, .32 * g[4] * a);
    }
  }

  SX.prototype.sceneFinale = function(p, gA) {
    // Full-page closing moment: the section-06 drawing breaks apart, the
    // pieces reassemble as the EASTMANS lockup centred in the viewport, the
    // canvas crossfades to the fixed overlay SVG (identical geometry, weight
    // and color / the handoff is invisible), the wordmark holds the screen
    // alone, then fades as the contact section scrolls in over it.
    // The whole beat resolves early so the wordmark has fully cleared the
    // screen before any contact copy scrolls into view.
    const xf = this.ramp(p, .44, .52);   // canvas hands over to the SVG lockup
    const out = this.ramp(p, .58, .70);  // gone well before the form arrives
    this.$('sx-fin').style.opacity = xf * (1 - out);
    if (this.act < 6) return; // the street belongs to sceneQuiet until section 07 leads
    const a = (1 - xf) * gA;
    if (a <= 0) return;
    // the street stays WHOLE until the section-06 copy has scrolled past,
    // then breaks apart / flying pieces leave while the fine detail dissolves
    const m = this.eio(this.ramp(p, .16, .42)); // street holds, then breaks apart
    const el = this.$('sx-finv');
    const r = this.finR || (this.finR = el.getBoundingClientRect()); // cached: fixed overlay, only moves on resize
    const vb = el.viewBox && el.viewBox.baseVal;
    const sx = r.width / ((vb && vb.width) || 1180), sy = r.height / ((vb && vb.height) || 220);
    const tgt = this.monoSegs();
    if (m >= 1) {
      // Landed + held with the SVG's own rendering semantics / the crossfade
      // swaps two identical drawings.
      this.strokeChains(tgt.chains, r, sx, sy, a);
      return;
    }
    // flight pool: sampled evenly along the whole street so every house flies
    const segs = this.streetSegs();
    const all = segs.filter(s => Math.hypot(s[2] - s[0], s[3] - s[1]) > Math.min(this.vw, 900) * .02);
    const pool = all.length ? all : segs;
    const stride = Math.max(1, Math.floor(pool.length / 160));
    const src = [], fly = new Set();
    for (let i = 0; i < pool.length && src.length < 160; i += stride) { src.push(pool[i]); fly.add(pool[i]); }
    // the standing street: identical to sceneQuiet's drawing, dissolving as
    // the flight departs (flying segments are drawn by the flight loop)
    const dA = a * (1 - this.ramp(m, 0, .7));
    if (dA > .004) {
      for (const g of segs) {
        if (m > 0 && fly.has(g)) continue;
        this.line(g[0], g[1], g[2], g[3], .32 * g[4] * dA);
      }
    }
    if (m <= 0 || r.width < 4) return;
    const T = tgt.segs;
    const wd = 1 + (3 * sx - 1) * m; // land at the SVG's exact stroke weight
    const n = Math.max(src.length, T.length);
    for (let i = 0; i < n; i++) {
      const s0 = src[i % src.length], t = T[i % T.length];
      const t0 = r.left + t[0] * sx, t1 = r.top + t[1] * sy, t2 = r.left + t[2] * sx, t3 = r.top + t[3] * sy;
      const live = i < T.length; // surplus lines dissolve in flight / exactly ONE mark lands
      const dup = i < src.length ? 1 : m; // second-pass copies emerge in flight, no pop at rest
      this.line(
        s0[0] + (t0 - s0[0]) * m, s0[1] + (t1 - s0[1]) * m,
        s0[2] + (t2 - s0[2]) * m, s0[3] + (t3 - s0[3]) * m,
        a * dup * (live ? .16 + .84 * m : .3 * (1 - m)), // lifts from street weight to full ink
        t[4] ? 0 : m, // per-segment landed color: echo strokes grey, primary strokes ink
        wd
      );
    }
  }

  // ---------- opening sequence ----------
  // The intro IS the opening scene rather than a spinner in front of it: East
  // London draws itself on the live canvas while the real scene warm-up runs
  // against an OFFSCREEN context, then every map line condenses into the hero
  // wordmark and hands off, pixel-matched, to the lockup SVG. The wordmark
  // appears exactly once; there is no second draw-in when the page goes live.
  // The page markup is painted underneath the plate throughout, so nothing is
  // withheld from the browser's first contentful paint.
  SX.prototype.preload = function() {
    scrollTo(0, 0);
    this.$('sx-lockv').style.opacity = 0;
    const oc = document.createElement('canvas');
    const warm = [
      () => this.sceneHeroCanvas(.8, 1, 0),
      () => this.sceneContext(.5, 1),
      () => this.sceneTransform(.3, 1),
      () => this.sceneTransform(.8, 1),
      () => this.scenePrinciples(.5, 1),
      () => this.scenePrinciples(.95, 1),
      () => this.sceneEast(.35, 1),
      () => this.sceneEast(.65, 1),
      () => this.sceneQuiet(.5, 1),
      () => this.sceneFinale(.5, 1),
      () => this.sceneFinale(.82, 1),
      () => { this.elevSegs(); this.mapSegs(this.mapRect(true)); this.lockSegs(); }
    ];
    let i = 0; const total = warm.length + 2;
    this.loadP = 0; this.loadDisp = 0;
    // any deliberate input cuts the sequence short / never hold a visitor hostage
    this.onSkip = () => this.skipLoad();
    addEventListener('pointerdown', this.onSkip);
    addEventListener('wheel', this.onSkip, { passive: true });
    addEventListener('touchstart', this.onSkip, { passive: true });
    addEventListener('keydown', this.onSkip);
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(r => setTimeout(r, 1600))]).then(() => {
      if (this.dead || this.phase !== 'load') return;
      this.measure();
      oc.width = this.cv.width; oc.height = this.cv.height;
      const ox = oc.getContext('2d');
      this.loadP = 2 / total;
      const step = () => {
        if (this.dead || this.phase !== 'load' || i >= warm.length) return;
        const real = this.cx; this.cx = ox;
        ox.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ox.clearRect(0, 0, this.vw, this.vh);
        try { warm[i](); } catch (e) { }
        this.cx = real;
        // warm passes poke the overlay opacities / keep them dark until we go live
        const f = this.$('sx-fin'); if (f) f.style.opacity = 0;
        const e2 = this.$('sx-el'); if (e2) e2.style.opacity = 0;
        i++; this.loadP = (2 + i) / total;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    setTimeout(() => this.finish(), 9000); // hard cap / never trap the visitor
  }

  SX.prototype.skipLoad = function() {
    if (this.phase !== 'load' || this.morphT0) return;
    this.loadP = 1;
    // rewind the clock rather than cutting: the morph still plays, just now
    this.loadT0 = performance.now() - 4000;
  }

  SX.prototype.finish = function() {
    if (this.dead || this.phase !== 'load') return;
    this.phase = 'live';
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t => removeEventListener(t, this.onSkip));
    const fin = this.$('sx-fin'); if (fin) fin.style.opacity = 0;
    const e = this.$('sx-el'); if (e) e.style.opacity = 0;
    const lockv = this.$('sx-lockv'); if (lockv) lockv.style.opacity = '';
    this.prepLock();
    this.cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx.clearRect(0, 0, this.vw, this.vh);
    document.documentElement.classList.remove('booting');
    this.introT0 = performance.now();
    this.introP = 1; this.introDone = true; // the lockup arrived via the morph / never redraw it
    this.idle = 0;
    this.measure();
  }

  // the SVG must be fully assembled BEFORE its fade-in: strokes drawn, sub-line
  // set / the crossfade swaps two identical wordmarks
  SX.prototype.prepLock = function() {
    if (this._lockPrep) return;
    this._lockPrep = 1;
    this.strokes.forEach(s => { s.el.style.strokeDashoffset = 0; });
    this.devs.style.opacity = 1;
    this.devs.style.letterSpacing = '0.58em';
  }

  SX.prototype.loaderFrame = function(now) {
    if (!this.loadT0) this.loadT0 = now;
    const el = (now - this.loadT0) / 1000;
    const c = this.cx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.vw, this.vh);
    const rect = this.mapRect(true);
    if (((this.loadP >= 1 && el >= 4.0) || el >= 6.2) && !this.morphT0) this.morphT0 = now;
    const mt = this.morphT0 ? (now - this.morphT0) / 1000 : 0;
    const mo = this.eio(this.ramp(mt, .05, 1.15));
    const xf = this.ramp(mt, 1.25, 1.7);
    const mapP = this.eio(this.ramp(el, .1, 2.0));
    if (mo < 1) {
      this.drawMap(rect, mapP, .85 * (1 - mo), 0);
      const lf = 1 - this.ramp(mt, 0, .3); // borough names dissolve as the morph begins
      if (lf > 0) {
        c.font = '10px "IBM Plex Mono",ui-monospace,monospace';
        if ('letterSpacing' in c) c.letterSpacing = '2px';
        const NAMES = ['WALTHAMSTOW', 'LEYTON', 'HACKNEY', 'STRATFORD', 'WANSTEAD', 'FOREST GATE'];
        this.LOCS.forEach((l, i) => {
          // one borough at a time: the cross pings, then the name types on
          const f = this.ramp(el, 1.1 + i * .38, 1.6 + i * .38) * lf;
          if (f <= 0) return;
          const x = rect.x + l.x * rect.w, y = rect.y + l.y * rect.h;
          const ca = this.ramp(f, 0, .25);
          this.line(x - 7, y, x + 7, y, .6 * ca, 1); this.line(x, y - 7, x, y + 7, .6 * ca, 1);
          const chars = Math.round(this.ramp(f, .18, 1) * NAMES[i].length);
          const sub = NAMES[i].slice(0, chars);
          c.fillStyle = 'rgba(242,241,237,' + (.9 * lf) + ')';
          if (sub) c.fillText(sub, x + 12, y - 8);
          if (chars < NAMES[i].length && ((now / 320) | 0) % 2) {
            c.fillRect(x + 13 + (sub ? c.measureText(sub).width : 0), y - 17, 5, 10); // typing caret
          }
        });
        if ('letterSpacing' in c) c.letterSpacing = '0px';
      }
    }
    const lockv = this.$('sx-lockv');
    if (mo > 0) {
      const r = lockv.getBoundingClientRect();
      if (r.width > 4) {
        const vb = lockv.viewBox && lockv.viewBox.baseVal;
        const sx = r.width / ((vb && vb.width) || 1180), sy = r.height / ((vb && vb.height) || 220);
        const tgt = this.lockSegs();
        if (mo >= 1) {
          this.strokeChains(tgt.chains, r, sx, sy, 1 - xf); // held, then crossfades to the SVG
        } else {
          const src = this.mapSegs(rect), T = tgt.segs;
          const wd = 1 + (3 * sx - 1) * mo; // land at the SVG's exact stroke weight
          const n = Math.max(src.length, T.length);
          for (let i = 0; i < n; i++) {
            const s0 = src[i % src.length], t = T[i % T.length];
            const t0 = r.left + t[0] * sx, t1 = r.top + t[1] * sy, t2 = r.left + t[2] * sx, t3 = r.top + t[3] * sy;
            const live = i < T.length; // surplus map lines dissolve in flight
            this.line(
              s0[0] + (t0 - s0[0]) * mo, s0[1] + (t1 - s0[1]) * mo,
              s0[2] + (t2 - s0[2]) * mo, s0[3] + (t3 - s0[3]) * mo,
              live ? s0[4] + (1 - s0[4]) * mo : s0[4] * (1 - mo),
              t[4] ? 0 : mo, wd
            );
          }
        }
      }
    }
    if (this.morphT0) this.prepLock();
    lockv.style.opacity = this.morphT0 ? xf : 0;
    const le = this.$('sx-load');
    this.loadDisp += (this.loadP - this.loadDisp) * .12;
    const digits = this.morphT0 ? 55 + 45 * this.ramp(mt, 0, 1.4) : 55 * (.4 * this.loadDisp + .6 * this.ramp(el, 0, 4.0));
    if (le) { le.textContent = String(Math.round(digits)).padStart(3, '0'); le.style.opacity = 1 - xf; }
    if (xf >= 1) this.finish();
  }

  // ---------- frame ----------

  SX.prototype.tickOnce = function() { this.update(this.cur); this.draw(this.cur); }

  SX.prototype.tick = function(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.tick);
    if (innerWidth !== this.vw || innerHeight !== this.vh) this.measure(); // catch missed resize events (pane drags)
    const target = Math.max(0, Math.min(scrollY, this.docH || scrollY)); // guard Safari rubber-band overscroll
    if (this.RM || this.k.smooth <= 0) this.cur = target;
    else {
      this.cur += (target - this.cur) * Math.min(1, this.k.smooth * 1.6);
      if (Math.abs(target - this.cur) < .4) this.cur = target;
    }
    if (this.phase === 'load') { // East London draws, then condenses into the wordmark
      this.loaderFrame(now);
      if (this.curOn) this.cursorFrame(now);
      return;
    }
    if (!this.introDone) {
      this.introP = this.clamp((now - this.introT0) / (this.mob ? 900 : 1600), 0, 1);
      if (this.introP >= 1) this.introDone = true;
      this.idle = 0;
    }
    const settled = this.cur === target && this.introDone;
    this.idle = settled ? this.idle + 1 : 0;
    if (this.idle < 5) { this.update(this.cur); this.draw(this.cur); }
    if (this.curOn) this.cursorFrame(now);
  }

  SX.prototype.update = function(y) {
    if (!this.secs || !this.secs.length) return;
    const vh = this.vh;
    const p1 = this.sp(0);
    const heroP = Math.max(this.eio(this.introP) * .42, p1);
    this.heroP = heroP;
    // logo assembly
    if (heroP < 1.01 && (!this._logoDone || heroP < 1)) {
      if (!this.RM) {
        this.strokes.forEach(s => {
          const f = this.clamp((heroP - s.s) / s.d, 0, 1);
          s.el.style.strokeDashoffset = s.len * (1 - this.eo(f));
        });
        const dv = this.ramp(heroP, .3, .4);
        this.devs.style.opacity = dv;
        this.devs.style.letterSpacing = (0.75 - 0.17 * this.eo(dv)) + 'em';
      }
      this.gg.style.opacity = this.ramp(heroP, .02, .1) * (1 - this.ramp(heroP, .5, .64));
    }
    const lock = this.$('sx-lock');
    const lo = 1 - this.ramp(p1, .58, .78);
    lock.style.opacity = lo;
    lock.style.transform = 'scale(' + (1 + this.ramp(p1, .5, 1) * .05) + ')';
    lock.style.visibility = lo <= 0 ? 'hidden' : 'visible';
    const cue = this.$('sx-cue');
    if (cue) cue.style.opacity = this.ramp(heroP, .3, .42) * (1 - this.clamp(y / (vh * .5), 0, 1));
    // reveals
    for (const r of this.rvs) {
      if (r.on) continue;
      if (r.sec >= 0) {
        const p = r.sec === 0 ? heroP : this.sp(r.sec);
        if (p >= r.at) this.reveal(r);
      }
        // viewport-triggered reveals are handled by IntersectionObserver (no layout reads here)
    }
    // fades
    for (const f of this.fds) {
      const p = f.sec === 0 ? heroP : this.sp(f.sec);
      let op = this.ramp(p, f.i, f.i + .09) * (1 - this.ramp(p, f.o, f.o + .09));
      if (f.ann && !this.k.ann) op = 0;
      f.el.style.opacity = op;
    }
    // map labels
    const p5 = this.sp(4);
    if (p5 > 0 && p5 < 1 || this._p5was) {
      const rect = this.mapRect(true);
      this.locEls.forEach((el, i) => {
        const l = this.LOCS[i];
        el.style.transform = 'translate(' + (rect.x + l.x * rect.w + 10) + 'px,' + (rect.y + l.y * rect.h - 8) + 'px)';
        el.style.opacity = this.ramp(p5, .12 + i * .05, .19 + i * .05) * (1 - this.ramp(p5, .5, .58));
      });
      this._p5was = p5 > 0 && p5 < 1;
    }
    // chapter + progress
    let act = 0;
    const yc = y + vh * .5;
    for (let i = 0; i < this.secs.length; i++) if (yc >= this.secs[i].top) act = i;
    if (act !== this._act) {
      this._act = act;
      this.$('sx-chn').textContent = String(act + 1).padStart(2, '0');
      this.$('sx-chl').textContent = this.CH[act].label;
    }
    this.act = act;
    const pd = this.$('sx-pd');
    if (pd && this.railH) pd.style.top = (this.clamp(y / this.docH, 0, 1) * (this.railH - 4)) + 'px';
  }

  SX.prototype.draw = function(y) {
    if (!this.secs || !this.secs.length) return;
    const c = this.cx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.vw, this.vh);
    const act = this.act || 0;
    const inView = i => { const s = this.secs[i]; return y < s.top + s.h && y + this.vh > s.top; };
    if (act === 0) this.sceneHeroCanvas(this.ramp(Math.max(this.heroP, this.sp(0)), .5, 1), 1, act);
    if (act === 1) {
      const p2 = this.sp(1);
      if (p2 < .3) this.sceneHeroCanvas(1, 1 - this.ramp(p2, 0, .22), 1);
      this.sceneContext(p2, 1);
    }
    if (act === 2) this.sceneTransform(this.sp(2), 1);
    if (act === 3) this.scenePrinciples(this.sp(3), 1);
    if (act === 4) this.sceneEast(this.sp(4), 1);
    if (act === 5) this.sceneQuiet(this.sp(5), 1);
    // finale runs unconditionally: the overlay is fixed-position, so its
    // opacity must be driven (to zero) from any scroll position
    const s7 = this.secs[6];
    this.sceneFinale(this.clamp((y + this.vh - s7.top) / (this.vh * 2.2), 0, 1), 1);
  }

  SX.prototype.cursorFrame = function(now) {
    if (!this.lastMove) { this.cd.style.opacity = 0; return; }
    if (now - this.lastMove > 3000 && this.idle > 5) return;
    this.cd.style.transform = 'translate(' + (this.mx - 2) + 'px,' + (this.my - 2) + 'px)';
    this.cd.style.opacity = this.curHide ? 0 : 1;
  }

  // ---------- interactions ----------
  SX.prototype.openNav = function() {
    this.lastF = document.activeElement;
    this.setNav(true);
    setTimeout(() => {
      const b = this.$('sx-ovlx');
      if (b) b.focus();
      this.setNoCursor();
    }, 60);
  }
  SX.prototype.closeNav = function() {
    this.setNav(false);
    if (this.lastF && this.lastF.focus) this.lastF.focus();
  }
  SX.prototype.jump = function(e) {
    const i = +e.currentTarget.dataset.i;
    if (this.navOpen) this.setNav(false);
    setTimeout(() => {
      let y = 0;
      if (i >= 0 && this.secs[i]) {
        const s = this.secs[i];
        y = s.top + (s.h > this.vh * 1.6 ? this.vh * .55 : 0);
        if (i === 6) y = s.top + this.vh * 1.45; // past the wordmark moment, onto the contact content
      }
      window.scrollTo({ top: Math.max(0, y), behavior: this.RM ? 'auto' : 'smooth' });
      this.idle = 0;
    }, 40);
  }
  SX.prototype.submit = function(e) {
    e.preventDefault();
    const f = e.target;
    const g = n => ((f.elements[n] && f.elements[n].value) || '').trim();
    const errs = {};
    if (!g('name')) errs.name = '/ Required';
    const em = g('email');
    if (!em) errs.email = '/ Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) errs.email = '/ Enter a valid email address';
    if (!g('reason')) errs.reason = '/ Select an option';
    if (!g('message')) errs.message = '/ Required';
    this.showErrors(errs);
    if (Object.keys(errs).length) {
      const first = ['name', 'email', 'reason', 'message'].find(n => errs[n]);
      if (f.elements[first]) f.elements[first].focus();
      return;
    }
    /* submissions disabled until a backend exists */
  }

  // ---------------------------------------------------------------- wiring
  SX.prototype.bind = function () {
    var self = this;
    document.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        self.jump({ currentTarget: { dataset: { i: b.getAttribute('data-jump') } } });
      });
    });
    var open = document.getElementById('sx-navopen');
    if (open) open.addEventListener('click', function () { self.openNav(); });
    var close = document.getElementById('sx-ovlx');
    if (close) close.addEventListener('click', function () { self.closeNav(); });
    var cfg = window.EASTMANS_CONFIG || {};
    var form = document.getElementById('sx-form');
    var btn = document.getElementById('sx-submit');
    if (form && btn && cfg.FORM_ENDPOINT) {
      // A real endpoint exists: restore the working control.
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
      btn.setAttribute('type', 'submit');
      btn.className = 'btn btn-p';
      var st = form.querySelector('.status');
      if (st) st.remove();
      form.addEventListener('submit', function (e) { self.submit(e); });
    } else if (form) {
      // No endpoint: the form must never look like it submitted.
      form.addEventListener('submit', function (e) { e.preventDefault(); });
    }
    // Analytics + Search Console are only ever emitted with real identifiers.
    if (cfg.GSC_TOKEN) {
      var m = document.createElement('meta');
      m.name = 'google-site-verification'; m.content = cfg.GSC_TOKEN;
      document.head.appendChild(m);
    }
    if (cfg.GA4_ID) {
      var g = document.createElement('script');
      g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.GA4_ID;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', cfg.GA4_ID);
    }
    // keep focus inside the index overlay while it is open
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !self.navOpen) return;
      var ovl = document.getElementById('sx-ovl');
      var f = ovl.querySelectorAll('button, [href], input, select, textarea');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  };

  var sx = new SX();
  sx.bind();

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start() {
    sx.boot();
    // pause the loop entirely while the tab is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(sx.raf); sx.raf = 0; }
      else if (!sx.raf && !sx.dead) { sx.idle = 0; sx.raf = requestAnimationFrame(sx.tick); }
    });
    // measure through ResizeObserver rather than layout reads per frame
    if ('ResizeObserver' in window) {
      var t = 0;
      new ResizeObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { if (!sx.dead) sx.measure(); }, 120);
      }).observe(document.documentElement);
    }
  }

  // Never compete with first paint: enhance after load, and let reduced-motion
  // users get the static page immediately.
  if (reduce) {
    document.documentElement.setAttribute('data-motion', 'reduced');
    start();
  } else if (document.readyState === 'complete') {
    requestAnimationFrame(start);
  } else {
    addEventListener('load', function () { requestAnimationFrame(start); }, { once: true });
  }
})();
