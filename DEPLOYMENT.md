# GitHub Pages deployment

ModelDeck is packaged in `site.zip` so GitHub Actions can publish the static app without requiring a Node build step.

On every push to `main` that changes `site.zip` or the Pages workflow, GitHub Actions extracts the app and deploys it to GitHub Pages.

## Enable Pages once

If Pages is not enabled for this repository yet, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Then open **Actions** and rerun the “Deploy ModelDeck to GitHub Pages” workflow if the first run fails because Pages was not configured.

The app calls AI provider APIs directly from the browser. Users must supply their own API keys; browser storage is not an encrypted vault. Some providers may block direct browser requests due to CORS.
