# Moreland Data Consulting — Full Site (homepage + blog)

Your homepage and blog now build together as ONE site.
- Homepage: src/../public/index.html  ->  served at /
- Blog:     src/pages/blog/           ->  served at /blog

## Setup (first time) 
Install Node.js 18+ (any 18+; you have 22). Then in this folder:
    npm install

## Writing a blog post
Add a Markdown file to `src/content/blog/`, e.g. `my-post.md`:

    ---
    title: "Your Post Title"
    description: "One-sentence summary (shows on index + in search results)."
    pubDate: 2026-07-15
    draft: false
    ---

    Your post in Markdown...

- Filename = URL slug:  my-post.md  ->  /blog/my-post/
- draft: true  keeps a post out of the build while you work on it.

## Editing the HOMEPAGE  
The homepage is public/index.html — plain HTML, edit it directly.
(It is intentionally NOT an Astro page, so it stays exactly as designed.)

## Preview locally
    npm run dev
Open http://localhost:4321  (homepage) and /blog (the blog).

## Build for deploy
    npm run build
Everything lands in `dist/`  — homepage at dist/index.html, blog under dist/blog/.

## DEPLOY TO CLOUDFLARE PAGES  (replaces your current site)
See DEPLOY.md for step-by-step. Short version:
  Build command:    npm run build
  Output directory: dist
