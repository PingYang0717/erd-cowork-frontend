# 14: Gallery「Shared to me」id 去重

**What to build:** An Artifact shared with the user multiple times shows up once, without hiding distinct Artifacts that happen to share a name.

**Blocked by:** None (can start immediately)

**Status:** done

> **Note:** `.scratch/erd-cowork-frontend/` ticket 14 previously removed a name-based `dedupeSharedByName` as unrequested behaviour that could hide unrelated rows. This ticket reintroduces deduplication deliberately, keyed by Artifact id instead of name, which avoids that failure mode — this is a considered reversal, not a repeat of the same mistake.

- [ ] The "Shared to me" filter/list de-duplicates entries by Artifact id, so the same Artifact shared multiple times (e.g. to different departments) appears once
- [ ] Two distinct Artifacts that happen to share a name both still appear
- [ ] Seam test: seed one Artifact id shared twice and two different Artifacts with identical names; assert the former collapses to a single card and the latter both remain
