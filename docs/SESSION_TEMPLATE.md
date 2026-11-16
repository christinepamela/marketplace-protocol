# Session Handover Template

Copy this to `docs/session-handovers/<N>.md` at the end of a session.

---

## The one rule

**A handover holds only what became true for the first time in this session.**

Everything durable goes in a standing doc **the same turn it is discovered**, not at handover time:

| If it is... | It goes in... |
|---|---|
| A known problem, deferred or broken | `TECH_DEBT.md`, with an ID checked against the live file. When fixed, it moves to `TECH_DEBT_ARCHIVE.md`. |
| A symptom you had to diagnose | `TROUBLESHOOTING.md`, as a new `T<N>` entry |
| A working rule, credential, principle, design rule or test data | `OPERATIONS.md` |
| What you did today | this handover |

Do not re-type standing content into the handover; link to it. Before declaring standing knowledge nonexistent, check the most recent handover, not an older one.

---

## Template

```markdown
# SESSION <N> HANDOVER

Date: <date> | Sessions completed: 1–<N> | Handover for: Session <N+1>

Standing context is not repeated here. Read first: `docs/OPERATIONS.md`, `docs/TROUBLESHOOTING.md`, `docs/TECH_DEBT.md`.

## Read this first

Top commit should be `<hash> <message>`. Confirm with `git log --oneline -5`. If it is missing, the work was never pushed: commit and push before anything else.

<Anything that changes how the next session should start. Two or three lines, or say there is nothing.>

**Plan versus actual:** <Did this session follow the plan the last handover set? If not, say so and why.>

## What happened

**Commits:**
<hash>  <message>

### <Item>: ✅ DONE / ⚠️ PARTIAL / ❌ NOT STARTED
**What / Why / How / Files changed / Tested** (what was actually run, and what passed)

<Say plainly what was not started.>

## Standing docs updated this session

| Doc | What changed |
|---|---|

<If nothing was promoted, say so; it usually means something was missed.>

## Database state

Schema changes, data changes, saved snippets added. Product and account changes go in `OPERATIONS.md`.

## Open decisions for <N+1>

<Decisions that need Pam's call, with the options and the tradeoff. Not work.>

## Priority plan for Session <N+1>

Two blocks per session, not seven. Order by what can actually finish. Stop at 80% context, commit, and write the handover.

**END OF SESSION <N> HANDOVER**
```

---

## Checklist before writing the handover

- [ ] Everything durable found this session is already in a standing doc
- [ ] New tech debt IDs were checked against the live file
- [ ] Every new symptom diagnosed has a `T<N>` entry
- [ ] Credential, test-data and design-rule changes are in `OPERATIONS.md`
- [ ] Items not completed are recorded as not completed, not dropped
- [ ] The handover copies nothing from a standing doc
- [ ] Work is committed and pushed, and the top commit hash is in the handover