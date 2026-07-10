import { defineConfig } from 'astro/config';

// https://astro.build
// Sitemap can be added later; the static homepage in public/ isn't seen by
// the sitemap integration, so it's omitted to keep builds clean.
export default defineConfig({
  site: 'https://morelanddataconsulting.com',
});
