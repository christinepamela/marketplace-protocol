# Rangkai: Project Structure

**Status:** rewritten Session 44 from the real file tree at `958364a` plus the S44 docs layout. The old version (390 lines) listed files that do not exist (`API.md`, `CONTRIBUTING.md`, `progress_roadmap/`).

```
marketplace-protocol/
├── README.md
├── package.json, tsconfig.json, tsconfig.api.json
├── .env.example, docker-compose.yml, .prettierrc, LICENSE
│
├── src/                           Protocol API and core (port 3000)
│   ├── api/
│   │   ├── index.ts, server.ts    Start-up and Express app
│   │   ├── scheduler.ts           Jobs: Bitcoin monitor, escrow release, vote expiry
│   │   ├── core/                  config, auth, errors, proof-keys, utils
│   │   ├── middleware/            auth, errors, rate limit, validation
│   │   ├── routes/                bitcoin, btcpay, catalog, dispute, governance,
│   │   │                          identity, logistics, order, rating, stripe, trust
│   │   ├── websocket/             /ws server and event types
│   │   └── docs/                  OpenAPI generator, Swagger route
│   ├── core/
│   │   ├── layer0-identity/       identity, reputation, proof, verification (empty)
│   │   ├── layer1-catalog/        product, category, search, search-cache (not connected)
│   │   ├── layer2-transaction/    order, escrow, fee, payment, payment-router,
│   │   │                          bitcoin, price-feed, types (order states)
│   │   ├── layer3-logistics/      provider, quote, tracking
│   │   ├── layer4-trust/          dispute, rating, compliance (sanctions, tax)
│   │   └── layer6-governance/     proposal, multisig, execution
│   │                              (no layer5 folder: the SDK is in packages/sdk)
│   └── infrastructure/
│       ├── database/client.ts     Supabase (Postgres)
│       └── payment/               stripe.adapter, btcpay.adapter
│
├── packages/sdk/                  @rangkai/sdk (TypeScript client, Layer 5)
├── rangkai-marketplace/           Marketplace client: sellers and buyers (port 3001)
├── logistics-marketplace/         Marketplace client: logistics providers (port 3002)
├── scripts/                       Key and token generators, OpenAPI generator, test data
│
└── docs/
    ├── architecture/              Current architecture. START HERE (readme.md)
    │   ├── readme.md              Index, actors, file list
    │   ├── layers.md              Layers 0 to 6, status and spec check
    │   ├── payments_and_fees.md   Fees, escrow, order states, disputes, freezes
    │   ├── actors_and_trust.md    Actors, identity tiers, dos and don'ts
    │   ├── logistics.md           Logistics pool
    │   ├── comms_and_nostr.md     Chat, Nostr, Buzz lessons
    │   ├── ref_client.md          Building a marketplace on the protocol
    │   └── diagrams/              Global map (SVG), functional and order lifecycle (Mermaid)
    ├── whitepaper/whitepaper.md   Two to three page public paper
    ├── api/                       OpenAPI files and phase API references
    ├── working/                   For the people and models doing the work
    │   ├── project_structure.md   This file
    │   ├── tech_debt.md           Everything open (check before any work)
    │   ├── operations.md          Working rules, principles, test data
    │   ├── troubleshooting.md     Symptoms and fixes
    │   ├── session_template.md    Handover template
    │   ├── agent_brief.md         Standing rules for AI agents working on the repo
    │   └── <N>.md                 The latest session handover (read first)
    └── archive/
        ├── tech_debt_archive.md   Fixed items
        └── session-handovers/     Older handovers
```

## Files that exist but are empty (placeholders)

`src/index.ts`, `src/api/core/client.ts`, `layer0-identity/verification.service.ts` (D59), `infrastructure/messaging/{email,sms,nostr,index}`, `infrastructure/storage/{s3,ipfs}.client.ts`, `infrastructure/payment/lightning.adapter.ts`. Each is a feature that was planned and not built.

## Where things start

| To do this | Start at |
|---|---|
| Run the API | `npm run dev:api` in the root (port 3000) |
| Build the SDK | `npm run build` in `packages/sdk` |
| Run a marketplace | `npm run dev` in `rangkai-marketplace` (3001) or `logistics-marketplace` (3002) |
| Find what is broken | `docs/working/tech_debt.md` |
| Understand a layer | `docs/architecture/layers.md` |
| Start a session | the latest handover in `docs/working/`, then the docs it links |

## Not covered here

Database tables. Read them from the live database or the migration scripts, not from a doc that can go stale.