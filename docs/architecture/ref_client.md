# Reference Client: building a marketplace on Rangkai

**Status:** DRAFT, Session 44. Replaces `docs/specs/REF_CLIENT.md`, which described a client that was never built that way (folder names, methods and flows differ from the code). This page is written from the code at `958364a`.

**Who this is for:** a marketplace entrepreneur, or the developer they hire, who wants to launch a marketplace for an industry or a country on the protocol.

---

## What you get, and what you build

The protocol gives you identity, catalog and search, orders, escrow and payouts, logistics, disputes, ratings and governance (`layers.md`). You build only the **front end** and the **rules of your own marketplace**: your brand, your categories, your KYC policy and your country's compliance. You also rule on disputes and earn the marketplace fee (default 2%, limit 0 to 5%, see `payments_and_fees.md`).

Two reference clients exist in the repository. Copy one and change it.

| Client | Folder | Port | For |
|---|---|---|---|
| **Rangkai marketplace** | `rangkai-marketplace` | 3001 | Sellers and buyers: browse, cart, checkout, orders, vendor dashboard |
| **Logistics marketplace** | `logistics-marketplace` | 3002 | Logistics providers: register, see opportunities, quote, run shipments |

The protocol API runs on port 3000. Both clients are Next.js 14 (React) with Tailwind, and talk to the protocol through `@rangkai/sdk` (`layers.md`, Layer 5).

---

## Start a new marketplace

1. Start the protocol API (`npm run dev:api` in the repository root).
2. Build the SDK (`packages/sdk`, `npm run build`).
3. Copy `rangkai-marketplace` to a new folder.
4. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to your protocol API.
5. Run `npm run dev` and change the name, colours and categories.

*Gaps to fix before this is a real "start here" guide:* a marketplace registry so your marketplace has its own ID and fee (D50); the payment API routes read a different variable (see below).

---

## How the client is laid out (`rangkai-marketplace`)

| Folder | What it holds |
|---|---|
| `app/` | Pages: home, products, cart, checkout, orders, auth (login, register), vendor area (dashboard, orders, products, product quotes) |
| `app/api/orders/[id]/` | Small server routes that pass Bitcoin and Stripe payment requests to the protocol |
| `components/` | UI pieces, grouped by auth, cart, logistics, orders, products, vendor and shared `ui` |
| `lib/sdk.ts` | Creates the SDK client. `createSDK(token)` gives a logged-in client |
| `lib/api/` | Helpers for auth, cart, logistics, orders and products |
| `lib/contexts/AuthContext.tsx` | Who is logged in |
| `lib/stores/cart.ts` | The cart |
| `lib/utils/` | Formatting and Incoterm helpers |

The theme is a warm neutral palette in `tailwind.config.js` (warm white, soft black, warm grey, taupe), inspired by Studio McGee. It is a starting point. Change it.

---

## Who does what in the client

| Actor | What the client lets them do | SDK modules |
|---|---|---|
| Buyer | Browse and search, add to cart, choose logistics, pay, track, rate, open a dispute | `catalog`, `orders`, `logistics`, `trust` |
| Seller (vendor) | List products, set Incoterm and logistics quotes, confirm and ship orders, see payouts | `catalog`, `orders`, `logistics` |
| Logistics provider | Register, browse opportunities, quote, update tracking (separate client) | `logistics` |
| Marketplace entrepreneur | Rule on disputes, see fee income, manage categories | Not in the client yet |

Registration offers all three identity types (KYC, Nostr, anonymous). KYC is the default.

---

## Calls the client makes

Names match `packages/sdk/src/modules`.

| Screen | SDK call |
|---|---|
| Sign up, log in | `identity.register`, login route |
| Browse and search | `catalog.search`, `catalog.getById` |
| Seller adds a product | `catalog.create`, `logistics.requestQuote`, `logistics.acceptQuote` |
| Checkout | `orders.create`, then a payment route (Bitcoin or Stripe) |
| Order page | `orders.getById`, `orders.getHistory`, `logistics.getShipmentByOrder` |
| Seller ships | `orders.confirm`, `orders.markAsShipped` |
| Buyer rates | `trust.submitRating` |
| Dispute | `trust.openDispute`, `trust.submitVendorResponse` (changes with D60) |

Live updates come from the WebSocket at `/ws`. Webhooks for server-to-server events are not built.

---

## What is not built yet

| For a marketplace entrepreneur | Item |
|---|---|
| Own marketplace ID, fee setting and free-months record | D50 |
| Fee ledger and live income statistics | D51 |
| A screen to rule on disputes and see the track record | D60 |
| Collecting the marketplace fee at payout | B28 |
| A way to mark a user KYC-verified under your country's rules | D59 |
| Payments module in the SDK | `layers.md`, Layer 5 |
| Chat rooms for orders | R26, `comms_and_nostr.md` |
| Sign-up built for phones and low literacy | D65 |
| A tidy build: the client does not compile cleanly (15 errors) | B23 |

---

## Problems found in the client code (S44)

- Two payment route files in `app/api/orders/[id]/` are named `bitcoin-payment-route.ts` and `bitcoin-status-route.ts`. Next.js only reads files named `route.ts`, so these are dead copies and differ from the live ones. Delete after checking.
- The payment routes read `NEXT_PUBLIC_PROTOCOL_URL`, while the rest of the client and `.env.local.example` use `NEXT_PUBLIC_API_URL`. Use one.
- `.env.local.example` lists a Supabase key "if needed". A marketplace should not need direct database access. Remove it from the example.