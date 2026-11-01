/*
 * Suivi des visites, commun aux quatre sites de Gabriel (portfolio, site vitrine, EquiCare, Dram).
 * Servi par le site vitrine : https://gabrielsagot.vercel.app/visites.js
 * Les événements partent vers /api/collect du site vitrine, qui les range dans Supabase.
 *
 * Utilisation :
 *   <script async src="https://gabrielsagot.vercel.app/visites.js" data-site="portfolio"></script>
 *   data-site    : portfolio | vitrine | equicare | dram (obligatoire)
 *   data-manual  : "1" → rien n'est envoyé avant visites.start() (applications : seulement le mode visiteur)
 *
 * API (utilisable avant le chargement du script grâce à la file window.visitesQ) :
 *   visites.start()              commence le suivi (mode manuel)
 *   visites.stop(forever)        arrête ; forever = cet appareil n'est plus jamais suivi sur ce site
 *   visites.track(nom, props)    événement libre (ex. « mode visiteur : ouvert »)
 *   visites.pageview()           page vue (les changements d'adresse sont déjà suivis tout seuls)
 * Pour ne pas être compté soi-même : ajouter ?visites=off à une adresse (?visites=on pour revenir).
 *
 * Jamais collecté : ce qui est tapé dans les champs, les cookies, l'adresse IP en clair.
 */
(function () {
  'use strict';
  if (window.visites && window.visites.loaded) return;

  var script = document.currentScript || document.querySelector('script[src*="visites.js"][data-site]');
  var SITE = (script && script.getAttribute('data-site')) || '';
  if (!/^(portfolio|vitrine|equicare|dram)$/.test(SITE)) return;
  var MANUAL = script && script.getAttribute('data-manual') === '1';
  var ENDPOINT =
    (script && script.getAttribute('data-endpoint')) ||
    (script && script.src ? new URL('/api/collect', script.src).href : '/api/collect');

  /** Les quatre sites : un lien de l'un vers l'autre emporte l'identifiant de session (parcours). */
  var FAMILY = [
    'gabrielsagot.github.io',
    'gabrielsagot.vercel.app',
    'equi-care-app.vercel.app',
    'app-equicare.vercel.app',
    'horse-planner-plum.vercel.app',
    'dram-one.vercel.app',
  ];
  var SESSION_IDLE = 30 * 60 * 1000;
  var VISITOR_LIFE = 395 * 24 * 3600 * 1000; // 13 mois
  var K = 'visites.' + SITE + '.';

  // ——— Petits outils ———
  function now() {
    return Date.now();
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 256).toString(16).slice(1));
    return (
      h.slice(0, 4).join('') +
      '-' +
      h.slice(4, 6).join('') +
      '-' +
      h.slice(6, 8).join('') +
      '-' +
      h.slice(8, 10).join('') +
      '-' +
      h.slice(10).join('')
    );
  }
  function get(key) {
    try {
      var v = localStorage.getItem(K + key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }
  function set(key, value) {
    try {
      if (value === null) localStorage.removeItem(K + key);
      else localStorage.setItem(K + key, JSON.stringify(value));
    } catch (e) {
      /* stockage indisponible : on continue sans */
    }
  }
  function cut(s, n) {
    s = s == null ? '' : String(s);
    return s.length > n ? s.slice(0, n) : s;
  }
  function clean(text) {
    return cut(
      String(text || '')
        .replace(/\s+/g, ' ')
        .trim(),
      100,
    );
  }
  function hostOf(url) {
    try {
      return new URL(url, location.href).hostname;
    } catch (e) {
      return '';
    }
  }

  // ——— Refus de suivi (?visites=off) ———
  try {
    var flag = new URLSearchParams(location.search).get('visites');
    if (flag === 'off') set('off', true);
    if (flag === 'on') set('off', null);
  } catch (e) {
    /* ancien navigateur */
  }

  // ——— Identifiants ———
  var visitor = get('v');
  if (!visitor || !visitor.id || now() - visitor.created > VISITOR_LIFE) {
    visitor = { id: uuid(), created: now(), n: 0 };
  }
  var session = get('s');
  var newSession = !session || !session.id || now() - session.last > SESSION_IDLE;
  if (newSession) {
    visitor.n = (visitor.n || 0) + 1;
    session = { id: uuid(), start: now(), last: now() };
  }

  // Lien venu d'un autre des quatre sites : ?_vs=<session d'origine>, retiré de l'adresse ensuite.
  var fromSession = null;
  try {
    var url0 = new URL(location.href);
    var vs = url0.searchParams.get('_vs');
    if (vs && /^[0-9a-f-]{36}$/i.test(vs)) fromSession = vs;
    if (url0.searchParams.has('_vs')) {
      url0.searchParams.delete('_vs');
      history.replaceState(history.state, '', url0.pathname + url0.search + url0.hash);
    }
  } catch (e) {
    /* rien */
  }
  if (fromSession && !newSession && session.from !== fromSession) {
    // Arrivée depuis un autre site : nouvelle session pour garder le parcours lisible.
    visitor.n = (visitor.n || 0) + 1;
    session = { id: uuid(), start: now(), last: now() };
    newSession = true;
  }
  if (fromSession) session.from = fromSession;

  // ——— Contexte de l'appareil (joint à chaque envoi) ———
  var nav = navigator;
  var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  function mq(q) {
    try {
      return window.matchMedia(q).matches;
    } catch (e) {
      return false;
    }
  }
  var ctx = {
    sw: screen.width,
    sh: screen.height,
    vw: window.innerWidth,
    vh: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    lang: nav.language || '',
    langs: (nav.languages || []).slice(0, 6).join(','),
    tz: (function () {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch (e) {
        return '';
      }
    })(),
    installed: mq('(display-mode: standalone)') || nav.standalone === true,
    bot: nav.webdriver === true,
    model: '',
    osv: '',
  };
  if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
    nav.userAgentData
      .getHighEntropyValues(['model', 'platformVersion'])
      .then(function (v) {
        ctx.model = cut(v.model, 80);
        ctx.osv = cut(v.platformVersion, 40);
      })
      .catch(function () {});
  }
  function deviceDetails() {
    return {
      connection: conn ? conn.effectiveType || '' : '',
      downlink: conn ? conn.downlink : null,
      rtt: conn ? conn.rtt : null,
      save_data: conn ? !!conn.saveData : null,
      memory_gb: nav.deviceMemory || null,
      cores: nav.hardwareConcurrency || null,
      touch_points: nav.maxTouchPoints || 0,
      dark: mq('(prefers-color-scheme: dark)'),
      reduced_motion: mq('(prefers-reduced-motion: reduce)'),
      cookies: nav.cookieEnabled,
      do_not_track: nav.doNotTrack === '1' || window.doNotTrack === '1',
      platform: cut(nav.platform, 40),
      orientation: screen.orientation ? screen.orientation.type : '',
      color_depth: screen.colorDepth,
      history_length: history.length,
      first_visit_at: new Date(visitor.created).toISOString(),
    };
  }

  // ——— File d'envoi ———
  var queue = get('q') || [];
  var timer = null;
  var running = false;
  var stopped = !!get('off');

  function save() {
    set('v', visitor);
    session.last = now();
    set('s', session);
  }
  function push(ev) {
    if (!running || stopped) return;
    ev.at = new Date().toISOString();
    queue.push(ev);
    if (queue.length > 300) queue = queue.slice(-300);
    set('q', queue);
    save();
    if (!timer) timer = setTimeout(flush, 4000);
  }
  function payload(batch) {
    return JSON.stringify({
      site: SITE,
      vid: visitor.id,
      sid: session.id,
      n: visitor.n,
      from: session.from || null,
      ctx: ctx,
      events: batch,
    });
  }
  function flush(useBeacon) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!queue.length) return;
    var batch = queue.splice(0, 40);
    set('q', queue);
    var body = payload(batch);
    if (useBeacon && nav.sendBeacon) {
      try {
        if (nav.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) {
          if (queue.length) flush(true);
          return;
        }
      } catch (e) {
        /* repli sur fetch */
      }
    }
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: body.length < 60000,
        headers: { 'content-type': 'text/plain' },
        body: body,
      })
        .then(function () {
          if (queue.length) flush(useBeacon);
        })
        .catch(function () {
          queue = batch.concat(queue).slice(-300);
          set('q', queue);
        });
    } catch (e) {
      queue = batch.concat(queue).slice(-300);
      set('q', queue);
    }
  }

  // ——— Pages vues, temps passé, défilement ———
  var page = null;
  var perfSent = false;
  var lastUrl = document.referrer || '';
  var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function searchWithoutNoise() {
    try {
      var p = new URLSearchParams(location.search);
      p.delete('_vs');
      var s = p.toString();
      return s ? '?' + s : '';
    } catch (e) {
      return location.search;
    }
  }
  function utms() {
    var out = {};
    try {
      var p = new URLSearchParams(location.search);
      for (var i = 0; i < utmKeys.length; i++) {
        var v = p.get(utmKeys[i]);
        if (v) out[utmKeys[i]] = cut(v, 200);
      }
      if (!out.utm_source && p.get('ref')) out.utm_source = cut(p.get('ref'), 200);
      if (!out.utm_source && p.get('src')) out.utm_source = cut(p.get('src'), 200);
    } catch (e) {
      /* rien */
    }
    return out;
  }
  function scrollPct() {
    var doc = document.documentElement;
    var h = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var seen = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
    return h > 0 ? Math.min(100, Math.round((seen / h) * 100)) : 100;
  }
  function onScroll() {
    if (page) page.scroll = Math.max(page.scroll, scrollPct());
  }
  function engagedNow() {
    if (!page) return 0;
    var t = page.engaged;
    if (page.since) t += now() - page.since;
    return t;
  }
  function perf() {
    var out = {};
    try {
      var n = performance.getEntriesByType('navigation')[0];
      if (n) {
        out.ttfb_ms = Math.round(n.responseStart);
        out.dom_ms = Math.round(n.domContentLoadedEventEnd);
        out.load_ms = Math.round(n.loadEventEnd);
        out.transfer_kb = Math.round((n.transferSize || 0) / 1024);
        out.nav_type = n.type;
      }
      if (vitals.lcp) out.lcp_ms = Math.round(vitals.lcp);
      out.cls = Math.round(vitals.cls * 1000) / 1000;
      if (vitals.inp) out.inp_ms = Math.round(vitals.inp);
    } catch (e) {
      /* rien */
    }
    return out;
  }
  function leave(final) {
    if (!page) return;
    var engaged = engagedNow();
    var delta = engaged - page.sentEngaged;
    if (delta < 300 && page.scroll <= page.sentScroll && !final) return;
    page.sentEngaged = engaged;
    page.sentScroll = page.scroll;
    var props = { total_ms: engaged };
    if (!perfSent) {
      perfSent = true;
      var p = perf();
      for (var k in p) props[k] = p[k];
    }
    push({
      type: 'leave',
      path: page.path,
      engaged_ms: Math.max(0, Math.round(delta)),
      scroll_pct: page.scroll,
      props: props,
    });
  }
  function pageview() {
    if (!running || stopped) return;
    var path = location.pathname + (location.hash && location.hash.indexOf('#/') === 0 ? location.hash : '');
    if (page && page.path === path && page.search === location.search) return;
    leave(true);
    var visible = document.visibilityState === 'visible';
    page = {
      path: path,
      search: location.search,
      engaged: 0,
      since: visible ? now() : 0,
      scroll: 0,
      sentEngaged: 0,
      sentScroll: 0,
      errors: 0,
    };
    var ev = {
      type: 'pageview',
      path: cut(path, 500),
      search: cut(searchWithoutNoise(), 1000),
      title: cut(document.title, 300),
      referrer: cut(lastUrl, 1000),
    };
    var u = utms();
    for (var k in u) ev[k] = u[k];
    push(ev);
    lastUrl = location.href;
    setTimeout(onScroll, 500);
  }

  // Mesures de vitesse (LCP, CLS, INP approché)
  var vitals = { lcp: 0, cls: 0, inp: 0 };
  try {
    new PerformanceObserver(function (l) {
      var e = l.getEntries();
      if (e.length) vitals.lcp = e[e.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) {
        if (!e.hadRecentInput) vitals.cls += e.value;
      });
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) {
        if (e.duration > vitals.inp) vitals.inp = e.duration;
      });
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (e) {
    /* navigateur sans ces mesures */
  }

  // ——— Clics ———
  var CLICKABLE =
    'a,button,[role=button],[role=tab],[role=link],[role=menuitem],[role=switch],[role=checkbox],[data-track],summary,label,select';
  function onClick(e) {
    if (!running || stopped) return;
    var el = e.target && e.target.closest ? e.target.closest(CLICKABLE) : null;
    if (!el) return;
    var tag = el.tagName.toLowerCase();
    var name =
      el.getAttribute('data-track') ||
      el.getAttribute('aria-label') ||
      clean(el.innerText || el.textContent) ||
      el.getAttribute('title') ||
      el.id ||
      tag;
    var props = { tag: tag };
    if (el.id) props.id = cut(el.id, 80);
    if (el.className && typeof el.className === 'string') props.class = cut(el.className, 120);
    var doc = document.documentElement;
    props.x_pct = Math.round((e.pageX / Math.max(1, doc.scrollWidth)) * 100);
    props.y_pct = Math.round((e.pageY / Math.max(1, doc.scrollHeight)) * 100);
    props.section = sectionOf(el);
    if (tag === 'a' && el.href) {
      var host = hostOf(el.href);
      props.href = cut(el.href.replace(/[?&]_vs=[^&#]*/, ''), 500);
      props.outbound = host !== location.hostname;
      if (/^(mailto|tel|sms):/.test(el.href)) props.contact = el.href.split(':')[0];
      if (/wa\.me|whatsapp/.test(el.href)) props.contact = 'whatsapp';
      if (props.outbound && FAMILY.indexOf(host) >= 0) decorate(el);
    }
    push({ type: 'click', name: cut(name, 120), path: page ? page.path : location.pathname, props: props });
    // Un lien qui quitte la page : on envoie tout de suite.
    if (props.outbound || props.contact) flush(true);
  }
  function sectionOf(el) {
    var s = el.closest && el.closest('section[id],[data-section],main[id],header,footer,nav');
    if (!s) return '';
    return cut(s.getAttribute('data-section') || s.id || s.tagName.toLowerCase(), 60);
  }
  function decorate(a) {
    try {
      var u = new URL(a.href);
      u.searchParams.set('_vs', session.id);
      a.href = u.href;
    } catch (e) {
      /* rien */
    }
  }

  // ——— Erreurs JavaScript ———
  function onError(message, source, line) {
    if (!page || page.errors >= 10) return;
    page.errors++;
    push({
      type: 'error',
      name: cut(message, 120),
      path: page.path,
      props: { source: cut(source, 300), line: line || null },
    });
  }

  // ——— Démarrage ———
  function start() {
    if (running || stopped) return;
    running = true;
    var details = deviceDetails();
    details.landing = location.pathname + searchWithoutNoise();
    details.new_session = newSession;
    push({ type: 'session', name: newSession ? 'début' : 'reprise', props: details });
    newSession = false;
    pageview();
    if (queue.length) flush();
  }
  function stop(forever) {
    if (running) {
      leave(true);
      flush(true);
    }
    running = false;
    if (forever) {
      stopped = true;
      set('off', true);
      set('q', null);
      queue = [];
    }
  }

  function wrapHistory(method) {
    var orig = history[method];
    history[method] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(pageview, 0);
      return r;
    };
  }
  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', function () {
    setTimeout(pageview, 0);
  });
  window.addEventListener('hashchange', function () {
    setTimeout(pageview, 0);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('copy', function () {
    if (page) push({ type: 'event', name: 'copie de texte', path: page.path });
  });
  window.addEventListener('error', function (e) {
    onError(e.message, e.filename, e.lineno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    onError('Promesse rejetée : ' + (e.reason && e.reason.message ? e.reason.message : e.reason), '', 0);
  });
  document.addEventListener('visibilitychange', function () {
    if (!page) return;
    if (document.visibilityState === 'hidden') {
      if (page.since) {
        page.engaged += now() - page.since;
        page.since = 0;
      }
      leave(false);
      flush(true);
    } else if (!page.since) {
      page.since = now();
      save();
    }
  });
  window.addEventListener('pagehide', function () {
    leave(true);
    flush(true);
  });
  window.addEventListener('online', function () {
    flush();
  });
  window.addEventListener('resize', function () {
    ctx.vw = window.innerWidth;
    ctx.vh = window.innerHeight;
  });

  var api = {
    loaded: true,
    start: start,
    stop: stop,
    pageview: pageview,
    track: function (name, props) {
      push({
        type: 'event',
        name: cut(name, 120),
        path: page ? page.path : location.pathname,
        props: props || {},
      });
    },
    session: function () {
      return session.id;
    },
  };
  window.visites = api;

  // Appels faits avant le chargement du script
  var pending = window.visitesQ || [];
  window.visitesQ = {
    push: function (call) {
      run(call);
    },
  };
  function run(call) {
    if (!call || !api[call[0]]) return;
    api[call[0]].apply(null, call.slice(1));
  }

  if (!MANUAL) start();
  for (var i = 0; i < pending.length; i++) run(pending[i]);
})();
