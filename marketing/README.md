# ContextOps AI — marketing website

A **static React 19 + Vite** marketing website for the ContextOps AI controlled pilot. This is separate from the backend Next.js SaaS app under `src/`, because GitHub Pages cannot host API routes, PostgreSQL, server-side authentication, or import workers.

## Run locally

```bash
cd marketing
npm install
npm run dev
```

Open http://localhost:4173/contextOps/ (Vite may serve the root page after redirect).

## Build

```bash
cd marketing
npm run build
npm run preview
```

The build produces `marketing/dist`. The Vite base path is `/contextOps/`, matching this repository's GitHub Pages project URL.

## Deploy

The `.github/workflows/deploy-marketing.yml` workflow builds, uploads and publishes the static site on commits to `main` that change marketing content or website files. It also supports manual dispatch.

If the GitHub Pages site is not enabled automatically by the workflow, open repository **Settings → Pages → Build and deployment → Source: GitHub Actions**, then rerun the workflow.

Expected URL: **https://ankitparekh007.github.io/contextOps/** — verify the deployment job before claiming it is live.

The site is standalone, requires no backend credentials, and has no broken login/register CTA. Buttons point to the GitHub repository, local setup documentation, and relevant product sections. The interactive calculator is a fully client-side scenario demonstration (not actual verified savings).

## Source of truth

Marketing feature copy is imported from `src/lib/marketing-content.ts`, shared with the main repository. Do not claim live routing, fine-tuned business models, enterprise security certification, connected customer data, or verified realized savings until implemented and validated.

## Interactive UI verification

The site has Playwright browser checks for theme persistence, sticky-header behavior, scroll-driven navigation, mobile menus and reduced-motion accessibility. To run locally:

```bash
cd marketing
npm install
npx playwright install chromium
npm run build
npm run test:e2e
```

The GitHub Pages workflow runs these tests before uploading or publishing.
