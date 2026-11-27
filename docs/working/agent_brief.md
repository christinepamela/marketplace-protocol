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
- You may create your own channel, branch, worktree and scratch files without asking, as long as they stay in your own folders and do not touch the project. List what you created in the report, and delete scratch files before you commit. Never write into Pam's own checkout (`C:\Users\chris\marketplace-protocol`) or her `.env`, and never push.
- One item per branch and one item per channel. If you find another problem, report it. Do not fix it.
- Commit messages: first line is `<item id>: what it does`. The body says what was wrong, what you changed, how you checked it. End with a `Co-authored-by:` line for yourself.
- **Session label:** never choose one. Pam gives the label in the brief (for example "S44"); copy it into `Fixed S<N>`, the "Last updated" line and anywhere else a session is named. (B36 first used the wrong label, S46.)
- **Archive wording:** end the archive entry with `Done by <agent>, reviewed by Claude, merged by Pam.` The archive is only read after Pam's merges it, so that is true by the time anyone reads it. Do not write "awaiting".
- **Starting point:** branch from the current GitHub `main`. If `main` has moved since you started, say so and rebase before you deliver.

**Callers and coverage**
- When an item says "find every use" or "every place", search the whole repo: `src`, `scripts`, `packages`, `rangkai-marketplace` and `logistics-marketplace`. Not only `src/`.
- Say which folders `tsc` and `npm test` actually cover. The root `tsconfig.json` includes only `src/**`, so `scripts/`, `packages/` and the apps are not checked by the root `tsc`. (B40: the signing helper's 17 callers were in `scripts/`.)

**Schema and tests**
- A column name comes from the real database, never from other code and never from a test stub. Ask Pam to run a read-only query on `information_schema.columns` and paste it. (B41: the rating code used `did`, the table has `vendor_did`, and the tests passed because the stub accepted both.)
- A stub must model the real schema: hold only the real columns and reject a filter on a column that does not exist, so a wrong name fails a test instead of passing.
- When a fix would make a code path run live for the first time, say what else in that path then goes live (for example another bug), and put that in the item's deploy note.

**Money, identity and governance**
- Do not change money movement, escrow, payout, identity storage, keys or governance without a human decision. These are marked High or "Pam decides" in `tech_debt.md`.

## Definition of done

1. The fix is limited to the item. No unrelated cleanup.
2. A unit test fails before and passes after, and it runs with `npm test`.
3. `npx tsc --noEmit` shows no new errors. Baselines today (S44, after B44): 0 at the root and 14 in `rangkai-marketplace` (B23). `npm test` baseline today: 5 suites, 42 tests passed, none failing. Single test files now exit on their own (B49).
4. You say what you could not check.
5. The `tech_debt.md` entry is updated in the same branch: the item's block is moved to `docs/archive/tech_debt_archive.md` with `**Status:** ✅ Fixed S<number>.` and a one-line summary, the index row is removed, the "tails" line is correct. New problems you found become new items with the next free ID.
6. You deliver a patch (`git format-patch`) and a report. Pam reads the patch. Say how it applies: Pam merges the branch from the worktree, and a multi-commit patch needs `git am`, not `git apply`. Test the patch in a throwaway clone before you say it applies.
7. Before you report, run your own self-check and show it: search the patch for keys and `.env` content, list every file changed, `npm test`, `tsc` against the baselines, and a search for any wrong session label.

## Report format

- What was wrong, in one or two sentences (and anything worse than the doc said).
- Files changed, with line counts.
- How you checked it, with the real output.
- What you could not check.
- Anything you noticed outside the item (reported, not fixed).

## What an agent may take

| Level | Meaning | Items today |
|---|---|---|
| 1 | Pam names the item. You propose a patch. | B37, B39 |
| 2 | Same, and you also update `tech_debt.md` and the archive in the patch | Start here once an item at Level 1 has passed review |
| 3 | You may choose a low-risk item yourself, from the pre-approved list only (stage 2, granted by Pam 26 Nov S44) | **Pre-approved list: D57, B51** (B46, B17 and B44 are done). Pam approved this list on 26 Nov S44 from the triage (`docs/working/triage.md`); it grows only when Pam adds to it |
| Human decision first | Do not start without Pam | B26 to B28, B31 to B35, **B42, B43, B45 and B47** (reputation design: decided in principle S44; Pam and Claude split it into branches before an agent starts), D58, D59, D60, D62, D63, anything touching a key, a payout or the council |

Anything not listed: ask.

## Worked example: B30 (search text in the filter string)

- **Result:** merged as `d6a0fc5` and `6104ea4`. A search like `toys, games` made the public search endpoint fail with a 500. The fix quotes and escapes the text.
- **Done well:** read the docs in order; checked the code against the doc; found the problem worse than described; stayed within one item (nearly); reported what it could not verify; refused to use the key again when told.
- **Done wrong:** used the live service key without asking; first version of the test only proved its own model of the filter grammar, so live results after the fix were needed; also changed an unused function, `getSuggestions` (disclosed, harmless).
- **Lesson:** unit tests prove the logic. Evidence from the real system proves the fix. Ask Pam to run the live check and paste the output.

## Worked example: B36 (rating cap) and what it exposed

- **Result:** merged as `f4c2fd0` (three commits). The 0-100 clamp became `DEFAULT_REPUTATION_PARAMS.maxScore`. Seven tests, three fail on the old clamp.
- **Done well:** limited the patch to the cap; reported two nearby bugs (B41, B42) instead of fixing them; disclosed an unrequested edit; corrected its own claim about how the patch applies; accepted review changes cleanly.
- **Done wrong:** wrong session label (S46); the first archive text read as if ratings now moved reputation.
- **Lesson:** a green test can describe an unreachable path. The fix was correct, but a real rating wrote nothing, because the column name was wrong and the stub hid it. Check that the path is reachable in the real system, and keep the stub honest.

## Worked example: B41 (the rating write used a column the table does not have)

- **Result:** merged as `41b563c` and `29c34d8`. Both queries use `vendor_did`; both errors are read. The test stub now rejects a column the table does not have; nine of eleven tests fail on the old code.
- **Done well:** stayed inside the item; chose, and said it was choosing, to treat `PGRST116` (no row) as quiet and every other error as loud; reported a new bug instead of fixing it (B44); showed the failing and passing runs; used the session label from the brief; patch applied as described.
- **Done wrong:** nothing that counts. Two nits: a missing blank line in `tech_debt.md`, and "awaiting merge" wording, which was a gap in this brief and is now a rule.
- **Lesson:** making an error loud has a cost. Reviewing it turned up B45: the rating is saved before reputation is updated, so a failure now shows an error for a rating that was stored. When a fix turns silence into failure, ask what the caller sees.

## Worked example: B40 (token type)

- **Result:** merged as `218b8c9`, `b56c000`, `38db846`. `JwtPayload.type` is `IdentityType`; the root `tsc` baseline is 0; the 17 test-script call sites pass `'anonymous'`.
- **Done well:** type-only in `src/`; explained why `'anonymous'` keeps behaviour the same; proved the break with a throwaway tsconfig over `scripts/`; found that twelve sites hid behind `as any`; owned the mistake in the archive entry.
- **Done wrong:** the first report said no site passed `'user'`, from a search of `src/` only. The signing helper and its callers were in `scripts/`.
- **Lesson:** "no callers" is a claim about the whole repo. Search all of it, and say what the compiler does not cover.

## Worked example: B38 (test environment)

- **Result:** merged as `d691f29` and `b9eab6b`. `npm test` now loads the health suite (35 of 36 tests pass). A root `jest.setup-env.js` supplies fake, test-only environment values.
- **Done well:** chose the fix that kept the test importing the real app; made every value obviously fake and assigned unconditionally; checked what importing the app really does before working around it (no network, no scheduler, but a heartbeat timer); reported the two findings (B48, B49) instead of fixing them; printed the new file in full; disclosed the one slip.
- **Done wrong:** nothing that counts. The slip (creating its channel and worktree before saying so) is now allowed, see the rule above.
- **Lesson:** making a suite load can reveal tests that were never running. Report what they show; do not fix it in the same branch.

## Stage 2: how to pick

- Pick only from the pre-approved list (the Level 3 row above). Say which item you picked, in its channel, before you start.
- One item at a time. Everything else in this brief still applies.
- If the item turns out to need a decision, a database check or a change to money, identity, keys or governance, stop and report. Do not decide it yourself.
- A picked item still goes through the same review and merge. Stage 2 changes who chooses, not who checks.

## Classifying open items (triage)

- **A, agent-safe:** the entry's Fix is concrete; the change is code, tests, types, UI or docs; it does not touch money movement, escrow, payout, identity storage, keys or governance; no schema or database change; no product or design decision; verifiable by unit tests or `tsc` without live access.
- **B, needs a decision or a database check first:** clear once Pam decides or runs a read-only query. State the question.
- **C, Pam only:** money, identity, keys, governance, the council, schema or migrations, legal, anything marked "Pam decides", roadmap and v2 items.
- **D, verify first:** may already be fixed or out of date. Check it against the code and report.

A triage is a proposal. Pam approves the A list; only approved A items may be picked at stage 2.

## How an agent earns independence

The aim is an agent that gets it right without being checked every time. Independence is earned by a record of clean patches, and lost when a rule is broken. Pam decides every step up; the agent never moves itself.

**A clean patch** meets all of these: it needed no rework after review (optional nits do not count); the self-check was complete and honest; no rule in this brief was broken; the report said what could not be checked; nothing outside the item was changed without being disclosed.

| Stage | What the agent may do | What checks it | Moves up when |
|---|---|---|---|
| 1. Named item | Pam names the item; the agent proposes a patch | A second reviewer (Claude) reads the code; Pam merges | 3 clean patches in a row |
| 2. Pick from a list (now, granted by Pam 26 Nov S44) | Pam gives a list of pre-approved Level 1 items; the agent picks one, says which in the channel, then works it | Same review, Pam merges | 5 clean patches in a row at stage 2, and CI exists (see open items) |
| 3. Light review | For docs-only and test-only branches, Pam merges after reading the report; no second review. Code changes still get the second review | CI (`npm test`, `tsc` against baselines, secret scan) plus Pam | 5 more clean code patches |
| 4. Trusted for low-risk code | Level 1 code items with a second review only on request; Pam still runs every merge and push | CI plus Pam's reading of the report | Not decided. Revisit after stage 3 |

**Never, at any stage:** money movement, escrow, payouts, identity storage, keys, governance or council actions, writes to the live database, using a service key, merging or pushing. These stay human-decision (see the table above).

**Moving down:**
- A rule broken: back one stage, and the rule is added to this brief.
- A secret or key read or used without asking, a database write, a commit to `main` or a push: back to stage 1.
- A patch that did not apply as described: not clean, no move down.
Pam can move the agent down or up at any time.

**Track record** (Pam updates this after each merge):

| Item | Clean? | Why not |
|---|---|---|
| B30 | No | Used the service key without asking; first test only proved its own model |
| B36 | No | Wrong session label; wording said ratings now moved reputation; patch applied only in part by `git apply` |
| B41 | Yes | |
| B40 | No | Searched `src/` only and missed the signing helper's 17 callers in `scripts/`; corrected well after review |
| B38 | Yes | |
| B48 | Yes | |
| B49 | Yes | |
| triage-backlog | Yes | |
| B46 | Yes | |
| B17 | Yes | |
| B44 | Yes | Merged after review; 13 tests in the file, new test fails before the fix |

Clean patches in a row: 7 (B38, B48, B49, triage-backlog, B46, B17, B44); 4 of them since stage 2 was granted by Pam on 26 Nov S44. The next step up needs 5 clean patches at stage 2 and CI, so 1 more and CI.

## Open items for this brief

- A read-only database role (or a short list of pre-approved read queries) so the agent can check the real schema without the service key. Pam creates it. Needed before stage 2.
- CI on GitHub (a workflow that runs `npm test`, `tsc` against the baselines and a secret scan on every push). Needed before stage 2.
- Who is the second reviewer when Claude is not in the session.