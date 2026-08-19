---
name: todo
scope: sites/agentic-engineering/src/lib/assets
created: 2026-08-21
---

## Goal

A todo list app: add, complete, edit, and delete items, with the list
persisting across reloads. No accounts, no backend — open the file and use it.

## Locked decision

Local storage, no backend. The first build stays verifiable with machine checks
alone: a round-trip test writes items, reloads, and reads them back, with no
server state to mock. A backend with sync was rejected for the first build
because it moves verifiability from a test suite to an integration harness — the
wrong lesson for a worked example whose point is that each stage checks itself.

## Out of scope

Accounts, sharing, sync, due dates, priorities, tags. A first build holds to one
task model; the rest is a later unit.

## Approach

Four stages, each small enough to verify on its own, each shipped in a fresh
conversation.

1. **Data model + storage.** Define the item shape — `{ id, text, done }` — and
   the read/write functions over `localStorage`. Verify: a round-trip test
   writes three items, reloads, and reads them back.
2. **Add, complete, delete.** The three core actions and the list UI. Verify: a
   test adds an item, completes it, deletes it, and checks the list after each.
3. **Edit + filter.** Double-click to edit inline; filter by all, active, done.
   Verify: a test for the edit and one per filter.
4. **Persistence polish.** Load on start, save on every change. Verify: reload
   the page and the list survives.

## Validation

Each stage ships with a test that fails first and passes when the stage lands.
Done is all tests green and the list surviving a reload — no stage closes until
its check passes.

## Live log

**Now** — stage 1 (data model + storage) in flight.

## Residue

None yet.
