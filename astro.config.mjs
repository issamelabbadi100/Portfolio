import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Used for canonical URLs, Open Graph tags and sitemap.xml.
  site: 'https://issamelabbadi.netlify.app',
  integrations: [sitemap()],
});
