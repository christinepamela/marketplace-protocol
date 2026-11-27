# Session Handover Template

Copy this to `docs/working/<N>.md` at the end of a session, and move the previous handover to `docs/archive/session-handovers/`.

---

## The one rule

**A handover holds only what became true for the first time in this session.**

Everything durable goes in a standing doc **the same turn it is discovered**, not at handover time:

| If it is... | It goes in... |
|---|---|
| A known problem, deferred or broken | `tech_debt.md`, with an ID checked against the live file. When fixed, it moves to `../archive/tech_debt_archive.md`. |
| A symptom you had to diagnose | `troubleshooting.md`, as a new `T<N>` entry |
| A working rule, credential, principle, design rule or test data | `operations.md` |
| What you did today | this handover |

Do not re-type standing content into the handover; link to it. Before declaring standing knowledge nonexistent, check the most recent handover, not an older one.

---

## How the work is done: two modes

A session works in one of two modes. Say which one at the top of the handover.

| Mode | Who does the work | Claude's role | Use when |
|---|---|---|---|
| **A. Buzz agent (default from S45)** | The Buzz agent (Pollen) works the items, one at a time, from `agent_brief.md`, at the stage its track record has earned | Second reviewer: reads the patch against the code, runs it, writes the briefs and the docs commit. Does not write the fix itself | The agent is reachable and the items are on the pre-approved list. Cheaper: the S44 run closed 11 items for about USD 0.66 of agent compute |
| **B. Claude does the work** (the previous way) | Claude, in the session | Writes the fix, tests it and delivers the patch | The agent is not reachable, the item needs a decision or a database check, or it is money, identity, keys or governance (never given to an agent) |

Rules that hold in both modes: Claude's clone is read-only, Pam runs all git, files reach Pam through attachments, and the standing docs are updated the same turn. In mode A, `agent_brief.md` governs the agent; read it before giving it a task, and update its track record after each merge. If the agent becomes unavailable mid-session, switch to mode B and note the switch in the handover.

---

## Template

```markdown
# SESSION <N> HANDOVER

Date: <date> | Sessions completed: 1–<N> | Handover for: Session <N+1>

Standing context is not repeated here. Read first: `docs/working/operations.md`, `docs/working/troubleshooting.md`, `docs/working/tech_debt.md`, `docs/architecture/readme.md`.

## Read this first

Top commit should be `<hash> <message>`. Confirm with `git log --oneline -5`. If it is missing, the work was never pushed: commit and push before anything else.

<Anything that changes how the next session should start. Two or three lines, or say there is nothing.>

**Mode:** <A (Buzz agent) or B (Claude does the work); say if it switched.>

**Plan versus actual:** <Did this session follow the plan the last handover set? If not, say so and why.>

## What happened

**Commits:**
<hash>  <message>

### <Item>: ✅ DONE / ⚠️ PARTIAL / ❌ NOT STARTED
**What / Why / How / Files changed / Tested** (what was actually run, and what passed)
<Mode A: also who did it, the review result, and whether the patch counted as clean in the track record.>

<Say plainly what was not started.>

## Standing docs updated this session

| Doc | What changed |
|---|---|

<If nothing was promoted, say so; it usually means something was missed.>

## Database state

Schema changes, data changes, saved snippets added. Product and account changes go in `operations.md`.

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
- [ ] Credential, test-data and design-rule changes are in `operations.md`
- [ ] Items not completed are recorded as not completed, not dropped
- [ ] The handover copies nothing from a standing doc
- [ ] Mode A: the agent track record and approved list in `agent_brief.md` match what merged
- [ ] Work is committed and pushed, and the top commit hash is in the handover