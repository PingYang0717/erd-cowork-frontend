# 17: 檔案附件上傳

**What to build:** Users can attach files to a chat message, with the same limits as the mockup.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** ready-for-agent

- [ ] Composer supports drag-and-drop and click-to-browse file attachment
- [ ] Exceeding 5 files or 5GB total shows a validation warning and blocks submission
- [ ] Attached file metadata (name, size) is registered via a mock upload endpoint (no binary storage)
- [ ] `docs/api/interface.md` updated with the upload endpoint; `types/api/Upload.ts` finalized
- [ ] Seam test: attach files under/over the limit, assert validation behavior; assert attached file chips appear on the composer
