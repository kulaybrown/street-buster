# TODO
- [ ] Fix broken GitHub Pages image URLs by removing leading `/` and using `withBase()` for all runtime image URLs
- [ ] Update `src/App.jsx`: `src="assets/..."` -> `src={withBase("assets/...")}`
- [ ] Update `src/App.jsx`: `withBase(`/assets/...`)` -> `withBase(`assets/...`)`
- [ ] Rebuild (`npm run build`) and sanity-check `dist/index.html` and built asset URL prefixes

