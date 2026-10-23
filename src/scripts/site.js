// All page behaviour: theme toggle, language switch animation, copy buttons,
// fade-in on scroll and nav scroll-spy. Bundled by Astro, runs after parse.

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SWITCH_KEY = 'lang-switch';

/* ---------- Typewriter: erase / retype the text nodes in view ---------- */

// Text nodes inside main and the header nav that are currently on screen.
function textNodesInView() {
  const nodes = [];
  for (const scope of document.querySelectorAll('main, .site-header nav')) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const r = n.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && r.width > 0) nodes.push({ node: n, top: r.top });
    }
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

let erased = [];

// Remember the first text block below the header so the other language opens
// at the same place. Both pages share one structure, so the index matches.
const ANCHORS = 'main h1, main h2, main h3, main p, main li';
function anchorPoint() {
  const header = document.querySelector('.site-header').offsetHeight;
  const all = [...document.querySelectorAll(ANCHORS)];
  const index = all.findIndex((el) => el.getBoundingClientRect().top >= header);
  return index < 0 ? null : { index, delta: all[index].getBoundingClientRect().top };
}

async function switchLanguage(link) {
  try {
    localStorage.setItem('lang', link.dataset.lang);
    sessionStorage.setItem(SWITCH_KEY, JSON.stringify(anchorPoint()));
  } catch (e) {}
  link.classList.add('is-moving');
  if (!reduceMotion) {
    erased = wrap(textNodesInView(), true);
    await animate(erased, 1, 0, 350);
  }
  location.href = link.href;
}

// Arriving from a language switch: restore position, then type the text in.
async function arriveFromSwitch() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(SWITCH_KEY));
    sessionStorage.removeItem(SWITCH_KEY);
  } catch (e) {}
  if (saved === undefined) return;
  const el = saved && document.querySelectorAll(ANCHORS)[saved.index];
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - saved.delta, behavior: 'instant' });
  if (!root.classList.contains('tw-pending')) return;
  const items = wrap(textNodesInView(), false);
  root.classList.remove('tw-pending');
  await animate(items, 0, 1, 500);
  items.forEach((it) => it.restore());
}

// Back button restores this page from cache: undo the erase.
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  erased.forEach((it) => it.restore());
  erased = [];
  document.querySelectorAll('.lang-switch.is-moving').forEach((l) => l.classList.remove('is-moving'));
});

/* ---------- Clicks ---------- */

document.addEventListener('click', (e) => {
  const lang = e.target.closest('[data-lang]');
  if (lang && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) {
    e.preventDefault();
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
});

// Copy buttons only appear where the Clipboard API is available (HTTPS or localhost).
if (navigator.clipboard) {
  document.querySelectorAll('[data-copy]').forEach((b) => { b.hidden = false; });
}

/* ---------- Fade-in and scroll-spy ---------- */

const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
  }
}, { rootMargin: '0px 0px -10% 0px' });
reveals.forEach((el) => io.observe(el));

// Highlight the nav link of the section crossing the middle of the viewport.
const spy = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    document.querySelectorAll('[data-spy]').forEach((a) => {
      if (a.dataset.spy === en.target.dataset.nav) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('[data-nav]').forEach((s) => spy.observe(s));

arriveFromSwitch();
