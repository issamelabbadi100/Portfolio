# Portfolio: Issam El Abbadi

Personal portfolio site, bilingual French (default) and English. Static, no backend, no tracking.

Built with [Astro](https://astro.build) 7, plain CSS and about 4 KB of JavaScript. Fonts (Inter, JetBrains Mono) are self-hosted.

## Run it locally

Requires Node.js 22.23 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:4321 (French) or http://localhost:4321/en/ (English).

To check the production build:

```sh
npm run build     # outputs to dist/
npm run preview   # serves dist/ on http://localhost:4321
```

## Edit the text

All copy lives in two files, one per language. You never need to touch the markup to change wording.

| File | Page |
| --- | --- |
| `content/fr.json` | `/` (French) |
| `content/en.json` | `/en/` (English) |

Both files have the same keys. When you change something in one, change it in the other. Sections map to keys as follows:

| Section | Key |
| --- | --- |
| Page title and description (search engines, link previews) | `meta` |
| Name, contact details, LinkedIn, GitHub | `profile` |
| Hero: positioning line, buttons, key figures, technology row | `hero` |
| About | `about.paragraphs` |
| Skills | `skills.groups` |
| Experience | `experience.employers[].roles[]` |
| Professional and personal projects, pipeline diagram | `projects` |
| Education | `education.items` |
| Contact | `contact` |

Arrays (bullets, skills, roles, projects) can grow or shrink freely. Keep the same number of items in both languages, so switching language keeps the reader in the same place on the page.

House style: no em dashes; use colons, commas or separate lines.

## Add or replace the CV

1. Put the PDF in `public/cv/` named `CV-Issam-El-Abbadi-FR.pdf`.
2. That's it: both language pages link to it.

When an English CV exists, add `public/cv/CV-Issam-El-Abbadi-EN.pdf` and change `cv.href` in `content/en.json` to `cv/CV-Issam-El-Abbadi-EN.pdf`. You can also change `hero.cvHint` there from `PDF, French` to `PDF`.

## Social preview images and icons

`public/og-fr.png` and `public/og-en.png` (link previews on LinkedIn, Slack, WhatsApp...) and the PNG icons are generated from the content files and `public/favicon.svg`. After changing your name, title, positioning line or technology row, regenerate them:

```sh
npm run images
```

## Deploy to Netlify (recommended, works with a private repo)

`netlify.toml` already holds the build settings (`npm run build`, publish `dist`, Node 24).

1. In Netlify: **Add new site > Import an existing project > GitHub**, then pick this repository. Netlify asks for access to private repos during this step.
2. Accept the detected settings and deploy.
3. Copy the site URL Netlify gives you (or your custom domain) into `site` in `astro.config.mjs`, replacing `https://YOUR-SITE.netlify.app`. Commit and push. This URL is used for canonical links, link previews, `sitemap-index.xml` and `robots.txt`.

Every push to `main` redeploys. The footer year updates on each build.

## Deploy to GitHub Pages (alternative)

GitHub Pages on a free account only works for **public** repositories.

1. In `astro.config.mjs`, set `site: 'https://issamelabbadi100.github.io'` and add `base: '/Portfolio'`. All internal links already use the base path.
2. Add `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: withastro/action@v3  # check for a newer major version
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

3. In the repository settings: **Pages > Source: GitHub Actions**.

## Project structure

```
content/            fr.json, en.json: all copy
public/             favicon, social images, cv/ (drop the PDF here)
scripts/            generate-images.mjs (npm run images)
src/components/     one component per section, Page.astro assembles them
src/layouts/        Base.astro: <head>, SEO tags, JSON-LD
src/pages/          index.astro (FR), en/index.astro (EN), robots.txt.js
src/scripts/        site.js: theme, language switch animation, copy buttons, scroll effects
src/styles/         global.css: colour tokens (light/dark), typography, layout
```

## Notes

- Theme follows the system setting until the visitor uses the toggle; the choice is stored in `localStorage`.
- The language choice is stored in `localStorage`; returning visitors who picked English land on `/en/`.
- Visitors with "reduce motion" enabled get no fade-ins, no smooth scrolling and an instant language switch.
- The phone number is shown on the page but deliberately left out of the JSON-LD structured data.
