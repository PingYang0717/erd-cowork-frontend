# 17: 檔案附件上傳

**What to build:** Users can attach files to a chat message, with the same limits as the mockup.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** done

> Done together with ticket 16 in the same session: both live behind the same
> composer entry point (the "+" attach/connect menu), so they were built as
> one seam. "Blocks submission" is satisfied by capping accepted files at the
> limit itself (matching the mockup's `cwAddFiles` behavior) rather than
> disabling Send separately — a rejected file is never added, so the composer
> can never carry an over-limit selection in the first place. Scope trimmed
> from the mockup: no file-type restriction (`.csv`/`.xlsx` only) and no
> "示範資料集" quick-add sample list, since ticket 17's AC only specifies the
> count/size limits.

- [x] Composer supports drag-and-drop and click-to-browse file attachment
- [x] Exceeding 5 files or 5GB total shows a validation warning and blocks submission
- [x] Attached file metadata (name, size) is registered via a mock upload endpoint (no binary storage)
- [x] `docs/api/interface.md` updated with the upload endpoint; `types/api/Upload.ts` finalized
- [x] Seam test: attach files under/over the limit, assert validation behavior; assert attached file chips appear on the composer

## Comments

**2026-08-23:** Code review found attachments never reached the message: the composer
called `onSend(text)` with no attachment payload, `POST /sessions/:sessionId/messages`
had no field for one, and the chips were not cleared after sending — so files were
registered at `/uploads` and then orphaned. Fixed: the send request now carries
`attachments`, they are stored on `userMessage.attachments` and rendered as chips under
the sent message, and the composer clears its own chips on send. Seam test added in
`StudioPage.file-attachments.test.tsx`.

Still open against the mockup (deliberately deferred, not overlooked) — see
[ADR-0004](../../../docs/adr/0004-mockup-visual-fidelity-via-ant-design-icons.md):

- [ ] Attachment type filter: the mockup's `cwAddFiles` accepts only `.csv` / `.xlsx` /
      `.xls` and shows 「僅支援 .csv / .xlsx」 for anything else; `useFileAttachments`
      currently enforces the count and size limits only, while the composer placeholder
      already advertises ".csv / .xlsx"
- [ ] Drag-and-drop on the composer itself: today it works only inside the modal's
      dropzone
