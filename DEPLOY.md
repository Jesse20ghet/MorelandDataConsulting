# Deploying the merged site to morelanddataconsulting.com

Your homepage + blog now build together into one `dist/` folder. You'll point
your existing Cloudflare Pages project at this build. Two paths — pick ONE.

Your domain, DNS, and email routing all stay exactly as they are. This only
changes what content the site serves. Email (jesse@morelanddataconsulting.com)
is unaffected.

--------------------------------------------------------------------
PATH A — Git-connected (recommended: rebuilds automatically on every change)
--------------------------------------------------------------------
Best long-term. Once set up, you write a post, push to GitHub, and Cloudflare
rebuilds and deploys on its own.

1. Put this project in a GitHub repo:
   - Create a new repo on github.com (e.g. "moreland-site"), private is fine.
   - In this folder:
       git init
       git add .
       git commit -m "Homepage + blog"
       git branch -M main
       git remote add origin https://github.com/YOURNAME/moreland-site.git
       git push -u origin main
   (A .gitignore is included so node_modules/ and dist/ aren't committed.)

2. In Cloudflare dashboard -> Workers & Pages:
   - If your current site is a SEPARATE Pages project doing "upload assets,"
     you'll create a NEW Pages project connected to Git, then move the custom
     domain over to it (step 4). 
   - Click Create -> Pages -> Connect to Git -> pick your repo.

3. Build settings when prompted:
       Framework preset:   Astro   (or "None")
       Build command:      npm run build
       Build output dir:   dist
   Click Save and Deploy. Cloudflare installs deps, builds, and gives you a
   *.pages.dev preview URL. Open it and confirm the homepage AND /blog work.

4. Attach your domain:
   - In this new project -> Custom domains -> Set up a custom domain
   - Enter morelanddataconsulting.com  (and repeat for www. if you use it)
   - If the domain is currently attached to an OLD Pages project, Cloudflare
     will let you move it. Removing it from the old project and adding it here
     is the switch-over. SSL re-provisions in a few minutes.

--------------------------------------------------------------------
PATH B — Manual upload (simplest one-time, but you rebuild by hand each post)
--------------------------------------------------------------------
1. Run:  npm run build
2. Cloudflare -> your existing Pages project -> Create deployment
   -> Upload assets -> drag the CONTENTS of the `dist/` folder in
   (drag what's inside dist/, so index.html sits at the top level).
3. Deploy. It replaces the live site. Confirm homepage and /blog both load.

Every time you add a post, repeat: npm run build, then drag the new dist/.

--------------------------------------------------------------------
After deploying — verify
--------------------------------------------------------------------
- https://morelanddataconsulting.com          -> homepage
- https://morelanddataconsulting.com/blog      -> blog index
- https://morelanddataconsulting.com/blog/why-your-query-got-slow/  -> the post
- Click "Blog" in the homepage nav -> lands on /blog
- Click "All posts" / logo on a post -> returns to homepage

If the homepage loads but /blog 404s, the output directory wasn't `dist` —
recheck the build output setting (Path A) or that you dragged dist/'s CONTENTS
(Path B).

Recommendation: Path A. The one-time Git setup pays for itself the first time
you publish a post without touching Cloudflare at all.
EOF
echo "deploy guide written"