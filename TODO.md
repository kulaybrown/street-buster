# TODO

- [x] Fix production asset copying: update `vite.config.js` so the custom plugin merge-copies root `./assets/**` into `dist/assets/**` without deleting Vite’s generated `dist/assets`.

- [ ] Re-run `npm run build`.
- [ ] Verify that `dist/assets/actions/**` and other required images/gifs exist in build output.
- [ ] (Optional) If any assets still 404 in GitHub Pages, identify the missing paths and adjust copy logic accordingly.

