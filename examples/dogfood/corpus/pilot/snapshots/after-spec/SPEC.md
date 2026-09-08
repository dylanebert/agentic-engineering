# Spec: One Editable Note

A single plain browser page, served as static files from this folder, with one
editable note (a multiline text field) and a Clear button. No accounts, no
server-side data, no sync, no framework, no deployment, no styling brief.

## Stage 1 — Edit and Clear

- The page loads with an empty note.
- A person can type multiline text into the note.
- Clicking Clear empties the note.

Browser check (serve this folder, open the page in a private window):
1. Confirm the note starts empty.
2. Enter two lines: `First line` and `Second line`. Confirm both appear.
3. Click Clear. Confirm the field is empty.

## Stage 2 — Persist Across Reload

- Everything from Stage 1 still works.
- The current note text is preserved across a reload in the same browser at
  the same address, including when the note is empty.

Browser check (same window and address throughout):
1. Confirm the note starts empty; enter `First line` and `Second line`, then Clear.
2. Enter `Saved line` and `Keep this`. Reload. Both lines must remain.
3. Replace the text with `Edited note`. Reload. The edit must remain.
4. Click Clear. Reload. The note must still be empty.

Persistence is per-browser at this origin only: no sync, backup, or
cross-device access, and no guarantee after browser data is deleted.
