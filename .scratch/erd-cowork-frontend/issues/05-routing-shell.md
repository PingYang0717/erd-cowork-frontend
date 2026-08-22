# 05: Routing shell (Cowork routes)

**What to build:** Real, bookmarkable URLs for the four Cowork screens, so refreshing or sharing a link lands on the right screen ([ADR-0002](../../../docs/adr/0002-react-router-despite-state-driven-mockup.md)).

**Blocked by:** 01 (Project scaffold & tooling)

**Status:** done

- [x] React Router configured with `createBrowserRouter`; routes: `/cowork`, `/cowork/artifacts`, `/cowork/schedule`, `/cowork/artifact/:artifactId`
- [x] Each route renders a distinct (currently empty/placeholder) page component under `pages/`
- [x] Reloading the browser on any of these URLs keeps the user on that same screen
- [x] Root `/` redirects to `/cowork`
- [x] Seam test: navigate to each URL, assert the corresponding placeholder page renders
