# Agent brief: working on Rangkai tech debt

**Status:** started S44 (22 Nov 2026), after the first test item (B30). This is the standing instruction for any AI agent that works on this repo (Pollen on Buzz, Claude Code, others). The owner (Pam) adds a rule here each time an agent makes a mistake. Read all of it before you start.

## The project in four lines

Rangkai is an open protocol for cross-border small-business B2B trade: federated marketplaces, escrow (Bitcoin and Stripe), an open logistics pool (KYC providers only), disputes, ratings and governance. The code is the source of truth. If a doc and the code disagree, the code wins and you report it. The protocol is designed to have no people behind it, only rules: anything the protocol does on its own must be an automatic rule.

## Read first, in this order

1. `docs/architecture/readme.md`
2. `docs/working/44.md` (the latest handover)
3. `docs/working/tech_debt.md` (read it from GitHub `main` every time; it changes)
4. `docs/architecture/layers.md`, plus `payments_and_fees.md` if the item touches money

## Rules

**Secrets and live data**
- Never read `.env` or any secret. Never use a service key. If a task needs live data, ask Pam first and say exactly what you need. She runs the command herself. (This rule exists because B30's agent used the Supabase service key without asking. It only ran selects, but it should have asked.)
- Test with unit tests. Do not start the API server or the scheduler for a check: they run jobs that write to the database.

**Files and git**
- Work on a branch named `<item id>-<short name>` (for example `b36-rating-cap`), in a separate worktree. Never commit to `main`. Never push. Never merge. Pam runs the merge and push.
- Do not create files in the repo or in `.git` without saying so first. Delete scratch files before you commit.
- One item per branch and one item per channel. If you find another problem, report it. Do not fix it.
- Commit messages: first line is `<item id>: what it does`. The body says what was wrong, what you changed, how you checked it. End with a `Co-authored-by:` line for yourself.

**Money, identity and governance**
- Do not change money movement, escrow, payout, identity storage, keys or governance without a human decision. These are marked High or "Pam decides" in `tech_debt.md`.

## Definition of done

1. The fix is limited to the item. No unrelated cleanup.
2. A unit test fails before and passes after, and it runs with `npm test`.
3. `npx tsc --noEmit` shows no new errors. Baselines today: 1 at the root (B40) and 15 in `rangkai-marketplace` (B23).
4. You say what you could not check.
5. The `tech_debt.md` entry is updated in the same branch: the item's block is moved to `docs/archive/tech_debt_archive.md` with `**Status:** ✅ Fixed S<number>.` and a one-line summary, the index row is removed, the "tails" line is correct. New problems you found become new items with the next free ID.
6. You deliver a patch (`git format-patch`) and a report. Pam reads the patch.

## Report format

- What was wrong, in one or two sentences (and anything worse than the doc said).
- Files changed, with line counts.
- How you checked it, with the real output.
- What you could not check.
- Anything you noticed outside the item (reported, not fixed).

## What an agent may take

| Level | Meaning | Items today |
|---|---|---|
| 1 | Pam names the item. You propose a patch. | B36, B37, B38, B39, B40, B17 |
| 2 | Same, and you also update `tech_debt.md` and the archive in the patch | Start here once an item at Level 1 has passed review |
| 3 | You may choose a low-risk item yourself | Not yet |
| Human decision first | Do not start without Pam | B26 to B28, B31 to B35, D58, D59, D60, D62, D63, anything touching a key, a payout or the council |

Anything not listed: ask.

## Worked example: B30 (search text in the filter string)

- **Result:** merged as `d6a0fc5` and `6104ea4`. A search like `toys, games` made the public search endpoint fail with a 500. The fix quotes and escapes the text.
- **Done well:** read the docs in order; checked the code against the doc; found the problem worse than described; stayed within one item (nearly); reported what it could not verify; refused to use the key again when told.
- **Done wrong:** used the live service key without asking; first version of the test only proved its own model of the filter grammar, so live results after the fix were needed; also changed an unused function, `getSuggestions` (disclosed, harmless); left a stray empty file named `{` in the worktree.
- **Lesson:** unit tests prove the logic. Evidence from the real system proves the fix. Ask Pam to run the live check and paste the output.

## Open items for this brief

- When an agent may merge its own low-risk branch. Not decided. Today the answer is never.