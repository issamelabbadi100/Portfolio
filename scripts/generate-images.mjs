// Regenerates the PNG icons and social preview images from public/favicon.svg
// and the content files. Run with: npm run images
// Uses sharp, which ships with Astro.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const favicon = await readFile('public/favicon.svg');

await sharp(favicon, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(favicon, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');

// Wrap a sentence into lines of at most `max` characters.
function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const line = lines[lines.length - 1];
    if ((line + ' ' + word).trim().length > max) lines.push(word);
    else lines[lines.length - 1] = (line + ' ' + word).trim();
  }
  return lines;
}

for (const lang of ['fr', 'en']) {
  const t = JSON.parse(await readFile(`content/${lang}.json`, 'utf8'));
  const lines = wrap(t.hero.positioning, 68);
  const tech = t.hero.tech.join('  ·  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a1020"/>
  <rect x="0" y="0" width="12" height="630" fill="#3dd6a3"/>
  <g font-family="JetBrains Mono, Cascadia Mono, Consolas, monospace">
    <text x="80" y="140" fill="#3dd6a3" font-size="30" font-weight="600">${esc(t.profile.title)}</text>
    <text x="80" y="230" fill="#e6ebf2" font-size="76" font-weight="700">${esc(t.profile.name)}</text>
  </g>
  <g font-family="Segoe UI, Inter, Arial, sans-serif" fill="#9aa6b8" font-size="29">
    ${lines.map((l, i) => `<text x="80" y="${300 + i * 42}">${esc(l)}</text>`).join('\n    ')}
  </g>
  <line x1="80" y1="490" x2="1120" y2="490" stroke="#1f2b45" stroke-width="2"/>
  <g font-family="JetBrains Mono, Cascadia Mono, Consolas, monospace" font-size="24">
    <text x="80" y="545" fill="#e6ebf2">${esc(tech)}</text>
    <text x="1120" y="590" fill="#9aa6b8" text-anchor="end">${esc(t.profile.location)}</text>
  </g>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/og-${lang}.png`);
  console.log(`public/og-${lang}.png`);
}
