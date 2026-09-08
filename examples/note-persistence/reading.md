# Remember a Note

A note page lets you type and Clear, but loses your words when you reload. I supplied the working page and the browser-test setup, then asked an agent to add persistence. I supplied no saving code, task spec or test assertions.

## Describe Done

In a short first conversation, Luna wrote a spec: keep the latest text after reload, replace old text when you edit, and keep the page empty after Clear, even after another Clear and reload. Saving is local to this browser and page address, not an account or backup.

## Let the Agent Work

A fresh Luna conversation wrote four browser tests before changing the page. It operated Chromium through Playwright and read the failure: editing and Clear worked, but reloading lost a saved note. It then added persistence without changing the tests.

There was setup help: two launcher failures happened before the implementation conversation started. I diagnosed them without model calls and fed the same prompt through Pi's standard input instead. The repair and the supplied browser setup are part of the example, not work Luna did.

## Check the Evidence

All four tests passed on two fresh starts. Luna then deliberately removed saved Clear from a disposable copy. The existing test caught the old text returning after reload; the untouched good page passed again. This later regression was a test of the checks, not an original agent mistake.

That's **machine verification**: the browser performs actions and checks what the page actually shows. After a later change, an agent can start clean and repeat those checks. The requirements live in runnable tests rather than only in a conversation's memory.

Tests preserve their assumptions too. A fresh Sol review checked the requirements, tests and account of what happened; it found no consequential gap. That's **agent verification**, not another test run. **Human verification** is still pending: does using the note and Clear feel right, and is this account understandable? Storage denial, other browser engines and cross-tab behavior weren't tested.

[Complete setup, actors, prompts, code and receipts](detail.md). The earlier, longer example was rejected for verbosity; this is a separately recorded condition, not a claim that another model reproduced it.
