# Spec: Single Editable Note with Clear

## Goal

A plain browser page (single HTML file, no build step) with one editable note and a Clear button. No accounts, no server-side data, no sync, no framework, no deployment, no styling brief.

## Page behavior

- The page shows one editable note area (a `<textarea>`) and a Clear button.
- The note starts empty on first load.
- The note accepts multiline text.
- Clear empties the note.
- Nothing else: no save button, no timestamps, no extra UI.

## Stage 1 — Editing and clearing

- The note is editable; typed text (including multiple lines) appears in the note.
- Clear removes all text, leaving the note empty.
- No persistence yet: reloading the page discards the text.

### Browser check (Stage 1)

1. Open the page in a browser (same address).
2. Confirm the note starts empty.
3. Type several lines of text and confirm they appear.
4. Click Clear and confirm the note is empty.
5. Reload the page and confirm it is empty again (discard is acceptable at this stage).

## Stage 2 — Persisting text across reload

- The current note text is preserved across a reload in the same browser at the same address.
- An empty note is also preserved: if the note is empty at reload, it stays empty (no placeholder text appears).
- Persistence is local to the browser only (e.g., `localStorage`); no server involvement.

### Browser check (Stage 2)

1. Open the page in the same browser at the same address.
2. Type text, reload the page, and confirm the text is still there.
3. Clear the note, reload the page, and confirm it is still empty (no text reappears).
4. Open the same address in a different browser or a private window and confirm the note starts empty (persistence is per-browser).
