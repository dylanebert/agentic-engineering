# Remember the Note

## Done when

- The existing multiline note remains editable.
- After entering or replacing text, a reload shows the latest text.
- Clicking **Clear** empties the note, and a reload still shows it empty. Clicking **Clear** again and reloading also leaves it empty.
- The existing **Clear** behavior continues to work.
- The saved note is limited to this browser context and this page’s origin. It is not an account, backup, or sync service. Denied storage, cross-tab coordination, and other browser engines are out of scope.

## Implement and verify

1. Add browser-local persistence while keeping the current edit and Clear behavior.
2. Enter a multiline note and reload; observe that the same text remains.
3. Replace it with different text and reload; observe that only the replacement remains.
4. Click **Clear**, reload, click **Clear** again, and reload; observe that the note stays empty.
