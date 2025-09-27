# Exo-UI

A React + TypeScript application bootstrapped with Vite.

## Local development

```bash
pnpm install
pnpm dev
```

## Building for production

```bash
pnpm build
```

The optimized output is emitted to the `dist/` directory.

## Deploying to GitHub Pages

This repository ships with a GitHub Actions workflow that builds the site and publishes it to GitHub Pages.

1. Push your changes to the `main` branch.
2. In your repository settings on GitHub, enable the **Pages** feature and select **GitHub Actions** as the deployment source.
3. The **Deploy to GitHub Pages** workflow will automatically build the site and upload it to Pages. Once it completes, your site will be live at `https://<username>.github.io/<repository>/`.

Because the Vite configuration automatically detects the repository name from the GitHub build environment, all asset paths resolve correctly once the site is published.
