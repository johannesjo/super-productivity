# Feature & PR Review Guide

The full form of two AGENTS.md _Project rules_ — "Does it earn its place?" and
"Code review". The short invariants stay in AGENTS.md; the verification
mechanics live here. Read this before reviewing a feature PR, and when deciding
whether a feature you are about to build should exist at all.

## Does it earn its place?

For a new feature, the first review question is whether it should exist at all — not whether the diff is correct. Complexity added is permanent, so the burden is on the change to justify it. Is there real demand (reactions and distinct participants on the linked issue, not just the author)? Has the same idea been declined before — search **closed** issues, because a prior "no" needs new evidence, not a new PR. Does the PR's stated motivation survive checking: are the issues it cites actually open, or already fixed more cheaply (`git log -S`, `git tag --contains`)? Treat the motivation as a claim to verify, not context to accept. A correct, well-tested implementation of something that doesn't earn its place is still a decline, and the leanest fix that resolves the reported symptom usually wins.

## Long-term cost of a change

When reviewing new features, always double-check the potential long-term costs and risks a change introduces — maintenance burden, hard-to-reverse choices (data shapes, public/plugin APIs, sync formats), locked-in dependencies/abstractions, and footguns that only surface at scale or across synced clients — not just whether the immediate diff is correct.

## Related

- Product principles (feature creep, calm defaults) → [AGENTS.md](../AGENTS.md) § Product principles
- Load-bearing decisions already made → [ARCHITECTURE-DECISIONS.md](../ARCHITECTURE-DECISIONS.md)
- Sync-bug severity triage → [sync-and-op-log/sync-severity-triage.md](./sync-and-op-log/sync-severity-triage.md)
