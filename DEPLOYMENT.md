# GitHub Pages

ModelDeck is a static single-page app. The GitHub Actions workflow publishes the repository root on pushes to `main`.

If the first deployment fails because Pages is not enabled yet, open **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**, then rerun the workflow under **Actions → Deploy ModelDeck to GitHub Pages**.

The app calls AI provider APIs directly from the browser. Users must supply their own API keys. Browser local storage is not encrypted, and some providers may block browser requests due to CORS.
