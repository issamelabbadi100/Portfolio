import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // TODO: replace with your Netlify URL (or custom domain) once deployed.
  // Used for canonical URLs, Open Graph tags and sitemap.xml.
  site: 'https://YOUR-SITE.netlify.app',
  integrations: [sitemap()],
});
