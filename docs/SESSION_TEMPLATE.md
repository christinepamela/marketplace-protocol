# Session Handover Template

Location: `docs/SESSION_TEMPLATE.md`

Copy this to `docs/session-handovers/<N>.md` at the end of a session.

---

## The one rule

**A handover may only contain what became true for the first time in this session.**

Everything durable belongs in a standing document, promoted **the same turn it is discovered** —
not at handover time, when it gets forgotten:

| If it is… | It goes in… |
|---|---|
| A known problem, deferred or broken | `TECH_DEBT.md` — with an ID checked against the live doc |
| A symptom you had to diagnose | `TROUBLESHOOTING.md` — as a new `T<N>` entry |
| A working rule, credential, principle, or piece of test data | `OPERATIONS.md` — edited in place |
| What you did today | this handover |

**Do not re-type standing content into the handover.** Link to it. Re-typing is what caused the
S39 → S40 loss: thirteen troubleshooting entries, the role model, the test-data inventory, half
the credentials and an architectural principle all vanished in a single crossing, because
survival depended on someone remembering to copy them.

**Before declaring standing knowledge nonexistent, check the most recent handover, not an older
one.** S40 struck architectural principle 9 as a hallucination by checking against S37, which
predates it.

---

## Template

```markdown
# SESSION <N> HANDOVER

**Rangkai Protocol — Multi-Marketplace B2B Cross-Border Infrastructure**

Date: <date> | Sessions Completed: 1–<N> | Handover for: Session <N+1>

**Standing context is NOT repeated here. Read these first:**
- `docs/OPERATIONS.md` — how Pam works, principles, servers, credentials, test data
- `docs/TROUBLESHOOTING.md` — symptom → cause → fix
- `docs/TECH_DEBT.md` — B / D / R items

---

## Read this first

Top commit should be:
- `<hash> <message>`

Confirm with `git log --oneline -5`. If missing, work exists locally but wasn't pushed —
commit before anything else.

<Anything that genuinely changes how the next session should start. Two or three lines. If
there is nothing, say so and move on.>

---

## What happened

**Commits:**
```
<hash>  <message>
```

### <Item> — ✅ DONE / ⚠️ PARTIAL / ❌ NOT STARTED
**What:** …
**Why it mattered:** …
**How:** …
**Files changed:** …
**Tested:** <what was actually run, and what passed>

<Repeat per item. Be honest about NOT STARTED — S39 scoped six items for S40 and S40
completed zero of them; recording that plainly is what let S41 scope realistically.>

---

## Standing docs updated this session

| Doc | What changed |
|---|---|
| `TECH_DEBT.md` | <new IDs, updates, closures> |
| `TROUBLESHOOTING.md` | <new T entries> |
| `OPERATIONS.md` | <what changed and why> |

<If nothing was promoted, say so explicitly — it usually means something was missed.>

---

## Database state

**Schema changes this session:** <none / list>
**Data changes:** <migrations run, rows touched>
**Saved Supabase snippets added:** <names>

<Product/identity inventory changes go to OPERATIONS.md, not here. Note here only that
you updated it.>

---

## Open decisions for <N+1>

<Questions that need Pam's call, with the options and the tradeoff. Not work — decisions.>

---

## Priority plan for Session <N+1>

**Capacity is two blocks per session, not seven.** S39 handed S40 six items and S40 completed
zero. Order by what can actually finish.

1. …
2. …

Stop at 80% context, commit, and write the handover.

---

**END OF SESSION <N> HANDOVER**
```

---

## Handover checklist

Before writing the handover, confirm:

- [ ] Everything durable discovered this session is already in a standing doc
- [ ] Every new tech debt ID was checked against the live doc, not guessed
- [ ] Every new symptom diagnosed this session has a `T<N>` entry
- [ ] Credentials, test data and product inventory changes are in `OPERATIONS.md`
- [ ] The handover contains no content copied from a standing doc
- [ ] Items not completed are recorded as not completed, not quietly dropped
- [ ] Work is committed and pushed, and the top commit hash is in the handover