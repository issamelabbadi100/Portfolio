// All page behaviour: theme toggle, language switch (client-side via view
// transitions), copy buttons, fade-in on scroll and nav scroll-spy.
//
// The language switch keeps separate /(FR) and /en/(EN) URLs but navigates
// between them with Astro's ClientRouter instead of a full reload, so the
// sticky header persists and the typing animation runs uninterrupted.

import { navigate } from 'astro:transitions/client';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Typewriter: erase / retype the text nodes of <main> in view ---------- */

function textNodesInView() {
  const nodes = [];
  const main = document.querySelector('main');
  if (!main) return nodes;
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const r = n.parentElement.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.width > 0) nodes.push({ node: n, top: r.top });
  }
  return nodes;
}

// Wrap each node so hidden characters keep their space: layout never jumps.
// SVG text can't hold spans, so it just gets sliced.
function wrap(items, shown) {
  return items.map(({ node, top }) => {
    const text = node.nodeValue;
    if (node.parentElement.closest('svg')) {
      if (!shown) node.nodeValue = '';
      return { text, top, set: (k) => { node.nodeValue = text.slice(0, k); }, restore: () => { node.nodeValue = text; } };
    }
    const outer = document.createElement('span');
    const on = document.createElement('span');
    const off = document.createElement('span');
    off.className = 'tw-off';
    outer.append(on, off);
    node.replaceWith(outer);
    const set = (k) => { on.textContent = text.slice(0, k); off.textContent = text.slice(k); };
    set(shown ? text.length : 0);
    return { text, top, set, restore: () => outer.replaceWith(text) };
  });
}

// Animate every wrapped node from `from` to `to` (0..1 of its length),
// staggered slightly top to bottom; all finish within duration + 200ms.
function animate(items, from, to, duration) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      let done = true;
      for (const it of items) {
        const delay = Math.max(0, Math.min(1, it.top / innerHeight)) * 200;
        const p = Math.max(0, Math.min(1, (now - start - delay) / duration));
        if (p < 1) done = false;
        it.set(Math.round(it.text.length * (from + (to - from) * p)));
      }
      if (done) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- Reopen the other language at the same scroll position ---------- */

// Both languages share one structure, so the Nth text block maps across pages.
const ANCHORS = 'main h1, main h2, main h3, main p, main li';
function anchorPoint() {
  const header = document.querySelector('.site-header').offsetHeight;
  const all = [...document.querySelectorAll(ANCHORS)];
  const index = all.findIndex((el) => el.getBoundingClientRect().top >= header);
  return index < 0 ? null : { index, delta: all[index].getBoundingClientRect().top };
}
function restoreAnchor(saved) {
  if (!saved) return;
  const el = document.querySelectorAll(ANCHORS)[saved.index];
  if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - saved.delta, behavior: 'instant' });
}

/* ---------- Language switch ---------- */

let pending = null; // set when a switch starts, consumed after the swap

async function switchLanguage(link) {
  try { localStorage.setItem('lang', link.dataset.lang); } catch (e) {}
  link.classList.add('is-moving'); // slides the toggle thumb to the other language
  pending = anchorPoint();
  if (!reduceMotion) await animate(wrap(textNodesInView(), true), 1, 0, 350);
  navigate(link.href);
}

// The header is persisted (transition:persist), so it keeps the old language.
// Copy the incoming page's header markup in before the swap so its labels,
// the language toggle and the theme button all update.
document.addEventListener('astro:before-swap', (e) => {
  const cur = document.querySelector('.site-header');
  const next = e.newDocument.querySelector('.site-header');
  if (cur && next) cur.innerHTML = next.innerHTML;
});

// After the swap: restore scroll to the same place, then type the new text in.
document.addEventListener('astro:after-swap', () => {
  if (pending === null) return;
  const saved = pending;
  pending = null;
  restoreAnchor(saved);
  if (reduceMotion) return;
  const items = wrap(textNodesInView(), false);
  animate(items, 0, 1, 500).then(() => items.forEach((it) => it.restore()));
});

/* ---------- Clicks (delegated on document, so they survive swaps) ---------- */

// Capture phase: intercept the language link before ClientRouter's own click
// handler so our erase animation runs, then we drive the navigation ourselves.
document.addEventListener('click', (e) => {
  const lang = e.target.closest('[data-lang]');
  if (lang && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) {
    e.preventDefault();
    e.stopPropagation();
    switchLanguage(lang);
    return;
  }

  if (e.target.closest('[data-theme-toggle]')) {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (err) {}
  }

  const btn = e.target.closest('[data-copy]');
  if (btn && !btn.classList.contains('done')) {
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      const label = btn.querySelector('span');
      const original = label.textContent;
      label.textContent = btn.dataset.copied;
      btn.classList.add('done');
      document.querySelector('[data-copy-status]').textContent = btn.dataset.announce;
      setTimeout(() => { label.textContent = original; btn.classList.remove('done'); }, 2000);
    });
  }
}, true);

/* ---------- Per-page setup: copy visibility, fade-in, scroll-spy ---------- */
// Re-run on every page load AND after each view transition, because <main>
// (and the persisted header's inner markup) is replaced each time.

let revealIO, spyIO;

function setup() {
  // Copy buttons only appear where the Clipboard API is available (HTTPS or localhost).
  if (navigator.clipboard) {
    document.querySelectorAll('[data-copy]').forEach((b) => { b.hidden = false; });
  }

  revealIO?.disconnect();
  revealIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

  // Highlight the nav link of the section crossing the middle of the viewport.
  spyIO?.disconnect();
  spyIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      document.querySelectorAll('[data-spy]').forEach((a) => {
        if (a.dataset.spy === en.target.dataset.nav) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('[data-nav]').forEach((s) => spyIO.observe(s));
}

// Fires on the initial load and after every ClientRouter navigation.
document.addEventListener('astro:page-load', setup);
