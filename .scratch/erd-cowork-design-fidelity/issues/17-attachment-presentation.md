# 17: 附件呈現重製

**What to build:** Attachments look like part of the message they belong to, and the attachment picker's file list carries real file information instead of a generic chip.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Attachment chips render inside the user's message bubble, above the message text, instead of below the bubble
- [ ] Attachment Modal's file rows show a type-colored icon (csv = primary, xlsx = success), the filename, a "{TYPE} · {size}" line, and a 26×26 delete button — replacing the reused `AttachmentChip` badge
- [ ] Seam test: send a message with an attachment, assert the chip renders inside the bubble (before the message text); open the attachment Modal with files added, assert the new file-row layout renders with correct type coloring and size text
