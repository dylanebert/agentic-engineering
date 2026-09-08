# A Note That Remembers

This note page already lets you type and Clear. But reload it, and your words disappear. I supplied the page and browser-test setup; an agent added saving.

First, the agent wrote a **spec**: a description of done. Remember the latest text after reload, including an empty note after Clear.

A fresh conversation turned those requirements into browser tests. The agent ran them on the existing page, saw the missing behavior, then implemented saving. The tests passed.

This is **machine verification**. The agent operates the browser; the tests check the result. After a later change, start clean and repeat the checks. Requirements now live in tests the next agent can run, not just in a conversation it might never see.

Tests can share the same mistaken assumptions as the code. Another agent reviewed both and found no consequential gap: **agent verification**.

Finally, Dylan tried the note: “it works.” That's **human verification**: does it work for a person, not just pass a test?

The note saves only in this browser at this address. It isn't a backup or sync service.

[Use the note](REPLAY.md) · [Setup, assistance and complete evidence](detail.md)
