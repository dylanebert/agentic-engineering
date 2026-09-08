# Note Page Spec

A single plain HTML page with one editable note and a Clear button.
No accounts, server-side data, sync, framework, deployment, or styling brief.
All files live in this folder; the page is opened directly in a browser.

## Page

- One editable note: a multiline text area (e.g. `<textarea>`).
- One "Clear" button that empties the note.
- A fresh page opens with an empty note.
- Nothing else required.

## Stage 1 — Edit and clear (no persistence)

- The note can be edited: text can be typed, including multiple lines.
- Clicking Clear empties the note.
- Reloading the page discards the text (persistence is intentionally not added yet).

### Browser check (Stage 1)

1. Open `index.html` in a browser. The note is empty.
2. Type several lines of text into the note.
3. Click Clear. The note is empty.
4. Reload the page. The text is gone (expected at this stage).

## Stage 2 — Persist across reload

- The current text is preserved across a reload in the same browser at the same address.
- This includes an empty note: if the user clears the note and reloads, it stays empty.
- Use browser-local storage (e.g. `localStorage`) so no server is involved.

### Browser check (Stage 2)

1. Open `index.html` in a browser. The note is empty.
2. Type several lines of text. Reload the page. The text is still there.
3. Click Clear. Reload the page. The note is still empty.
4. Open the same address in a different browser (or a private window): the note starts empty — persistence is per-browser, as intended.

## Files

- `index.html` — the page (added in Stage 1).
- Behavior for Stage 2 is added in Stage 2, in this same folder.
