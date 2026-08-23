# 13: 附件副檔名驗證

**What to build:** Users can't attach a file type the analysis can't consume.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Attachment file picker input restricts selection to `.csv`/`.xlsx`/`.xls` (`accept` attribute)
- [ ] Selecting or dropping an unsupported file type shows the Chinese error "僅支援 .csv / .xlsx" and the file is not added
- [ ] Seam test: attempt to attach an unsupported file type, assert the error message renders and the attachment list is unchanged
