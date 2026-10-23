// robots.txt built from the `site` URL in astro.config.mjs, so it never goes stale.
export function GET({ site }) {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`);
}
