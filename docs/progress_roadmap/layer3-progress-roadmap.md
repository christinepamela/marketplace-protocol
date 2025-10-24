# Layer 3 – Progress & Roadmap

## Status Overview (as of Oct 2025)
- **Overall Completion:** ~50% (MVP for KYC logistics & quotes functional)  
- **Next Milestone:** Buyer override logic, anonymous logistics flow, ratings integration

---

## Phase Roadmap

### Phase 1 – KYC MVP (current phase)
**Goal:** Enable verified providers, quote submission, shipment creation, and tracking.

**Core Deliverables**
- ✅ `provider.service.ts` (register, update, retrieve)
- ✅ `quote.service.ts` (submit, accept, retrieve quotes)
- ✅ `tracking.service.ts` (create shipments, update status, tracking events)
- ⚙️ SQL migrations (`logistics_providers`, `shipping_quotes`, `shipments`, `tracking_events`)
- ⚙️ `test_layer3.ts` (integration tests for KYC path)

---

### Phase 2 – Ratings & Reviews
**Goal:** Capture provider performance, total deliveries, and review text.

**Deliverables**
- `provider_reviews` table migration
- Integration into `provider.service.ts`
- Update `getProviderStats()` to include rating/total deliveries
- Test coverage for rating updates and edge cases

---

### Phase 3 – Buyer Override Logic
**Goal:** Allow buyer-chosen providers while enforcing eligibility and risk acknowledgment.

**Deliverables**
- Override validation function
- Notifications for seller/provider on override
- Integration into `orderService` and quote workflow
- Test coverage for eligibility rules

---

### Phase 4 – Anonymous Logistics
**Goal:** Enable ZK pseudonymous providers for anonymous sellers.

**Deliverables**
- ZK identity registration for providers
- Restrict anonymous providers → anonymous sellers only
- Risk acknowledgment logic for KYC → anon interactions
- Full test suite

---

### Phase 5 – Governance & Telemetry
**Goal:** Ensure provider compliance, prevent rating manipulation, and track logistics pool usage.

**Deliverables**
- DAO hooks for provider disputes
- Metrics dashboard (active shipments, completed, pending quotes, average rating)
- Auditable logs and RLS rules

---

### Phase 6 – Optional Stretch
**Deliverables**
- Integration of ratings into Layer 0 Reputation NFT
- ML-assisted provider ranking and delivery prediction

---

## Completion Tracker

| Component             | Description                                           | Status  | Notes / Next Step                                 |
|-----------------------|-------------------------------------------------------|--------|--------------------------------------------------|
| `types.ts`             | Core Layer 3 types: Provider, Quote, Shipment, TrackingEvent, Review | ✅ Complete | No action required                               |
| `provider.service.ts`  | CRUD, stats, rating updates                           | ⚙️ 75% | Add buyer override logic + anon flow             |
| `quote.service.ts`     | Submit, accept, retrieve quotes                        | ✅ Complete | Integrate anon provider checks                  |
| `tracking.service.ts`  | Shipment lifecycle & events                            | ⚙️ 70% | Add proof verification edge cases               |
| `index.ts`             | Layer export                                          | ✅ Done | Clean imports                                   |
| SQL Schema             | Postgres tables for providers, quotes, shipments, events | ⚙️ 85% | Add ratings/reviews + buyer override fields    |
| `test_layer3.ts`       | Integration tests for core KYC path                   | ⚙️ 60% | Add buyer override, ratings, and anon provider tests |
| Docs / Spec Alignment  | Full narrative + tables                               | ✅ 90% | Keep updated with phases                        |

---

## Feature Coverage

| Feature Area          | Core KYC | Anonymous | Buyer Override | Ratings & Reviews | Notes |
|-----------------------|----------|----------|----------------|-----------------|-------|
| Registration           | ✅       | 🚧       | 🚧             | -               | Add ZK flow for anon providers |
| Quote Submission       | ✅       | ⚙️       | ⚙️             | -               | Restrict anon provider → anon seller only |
| Shipment & Tracking    | ✅       | ⚙️       | ⚙️             | -               | Add proof verification for anon path |
| Buyer Override         | ⚙️       | 🚧       | ✅             | -               | Phase 3 |
| Ratings & Reviews      | ✅       | ⚙️       | ⚙️             | ✅               | Phase 2 |
| Stats & Reputation     | ✅       | ⚙️       | ⚙️             | ⚙️               | Average rating, total deliveries |
