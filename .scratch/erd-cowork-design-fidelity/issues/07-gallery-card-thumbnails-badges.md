# 07: Gallery 卡片縮圖區分 + 分享徽章

**What to build:** Gallery cards become distinguishable and informative at a glance, matching the mockup's thumbnail coloring, session attribution, and sharing badges.

**Blocked by:** 02 (Per-version 生成/發佈狀態 + 生成動作)

**Status:** done

- [ ] Dashboard-kind Artifact cards use primary-bg/primary thumbnail coloring; slides-kind cards use fill-tertiary/secondary coloring (currently both kinds share the same colors)
- [ ] Each card shows a session-name row (fs11.5, tertiary color) identifying which session produced it
- [ ] Cards for Artifacts shared with the current user show a "Shared to me" overlay badge on the thumbnail's top-left corner
- [ ] Cards whose current version is published/shared (per ticket 02's state) show a primary-colored "Shared" badge in the card's meta row
- [ ] Seam test: seed a dashboard Artifact, a slides Artifact, a `sharedBy` Artifact, and a shared/published Artifact; assert each card variant renders its distinguishing visual marker
