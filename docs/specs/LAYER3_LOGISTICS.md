# Logistics Coordination - Layer 3

## Purpose

To create a decentralized logistics coordination framework that enables verified and anonymous participants to interact with marketplaces, manage shipments, submit quotes, and track orders — all while maintaining trust, reputation, and optional privacy.

This layer establishes a logistics pool, where sellers, buyers, and providers can select counterparts while enforcing compliance, risk awareness, and performance accountability.

## 1. Logistics Participant Types

### 1.1 KYC Logistics Providers

*   Fully verified via KYC, linked to a DID.
*   Can engage:
    *   KYC sellers (full visibility, reduced risk)
    *   Anonymous sellers (with explicit risk acknowledgment)
*   Eligible for regulated markets and high-value transactions.
*   Reputation affects visibility in seller/buyer pools.

### 1.2 Anonymous Logistics Providers

*   Operate pseudonymously using zero-knowledge proofs (ZKPs).
*   Can engage only anonymous sellers.
*   Cannot access KYC marketplaces.
*   Risk borne fully by provider due to pseudonymity.

### 1.3 Hybrid Providers

*   Providers with dual KYC/anon modes.
*   Can toggle modes depending on context.
*   Example: KYC providers may appear anonymously in certain marketplaces but reveal KYC for high-value or dispute-prone transactions.

## 2. Core Concepts

| Concept           | Description                                                                                                                                |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Logistics Pool    | Central registry of providers visible to sellers/buyers.                                                                                 |
| Buyer Override    | Optional feature allowing buyers to select their own provider if disagreeing with the seller's default choice.                               |
| Ratings & Reviews | Providers earn reputation points and reviews from completed shipments.                                                                    |
| Risk Acknowledgment | KYC providers engaging anonymous sellers must explicitly accept risks.                                                                      |
| Reputation Integration | Provider ratings feed into Layer 0 Reputation NFT system for portability and governance eligibility.                                      |

## 3. Provider Registration & Management

### 3.1 Registration

*   **Input:** `CreateProviderInput`
    *   `business_name`: `string`
    *   `identity_did`: `string` (DID, required for KYC)
    *   `service_regions`: `string[]` (ISO country codes)
    *   `shipping_methods`: `string[]` (`standard`, `express`, `freight`)
    *   `insurance_available`: `boolean`
*   Optional anonymity flag for anonymous providers.

### 3.2 Update & Ratings

*   Providers can update service regions, shipping methods, or insurance options.
*   Ratings are updated via Layer 3 after shipment delivery or dispute resolution.

## 4. Shipping Quotes

| Field             | Type        | Notes                         |
| :---------------- | :---------- | :---------------------------- |
| `order_id`        | `UUID`      | Linked to Layer 2 order       |
| `provider_id`     | `UUID`      | Logistics provider            |
| `method`          | `enum`      | `standard`, `express`         |
| `estimated_days`  | `int`       | Estimated delivery time       |
| `insurance_included` | `bool`      | True if insurance included  |
| `price_sats`      | `int`       | BTC price in satoshis         |
| `price_fiat`      | `decimal`   | Optional fiat price           |
| `currency`        | `string`    | Defaults to USD               |
| `status`          | `enum`      | `pending`, `accepted`         |
| `valid_until`     | `timestamp` | Quote expiration              |
| `created_at`      | `timestamp` | Record creation               |

## 5. Shipments & Tracking

### 5.1 Shipment Table

| Field                    | Type        | Notes                                                                  |
| :----------------------- | :---------- | :--------------------------------------------------------------------- |
| `id`                     | `UUID`      | PK                                                                     |
| `order_id`               | `UUID`      | FK Layer 2 order                                                       |
| `quote_id`               | `UUID`      | FK shipping quote                                                      |
| `provider_id`            | `UUID`      | FK logistics provider                                                  |
| `tracking_number`        | `text`      | Unique                                                                 |
| `status`                 | `enum`      | `pending_pickup`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed_delivery`, `returning`, `returned`, `lost`, `cancelled` |
| `current_location`       | `text`      | Optional                                                               |
| `estimated_delivery`     | `timestamp` |                                                                        |
| `proof_of_delivery_hash` | `text`      | SHA-256 hash of photo/signature                                        |
| `created_at`             | `timestamp` | Default now                                                            |
| `updated_at`             | `timestamp` | Auto-updated                                                           |

### 5.2 Tracking Events Table

| Field         | Type        | Notes                       |
| :------------ | :---------- | :-------------------------- |
| `id`          | `UUID`      | PK                          |
| `shipment_id` | `UUID`      | FK shipment                 |
| `status`      | `enum`      | Same as shipment status     |
| `location`    | `text`      | Optional                    |
| `notes`       | `text`      | Optional                    |
| `timestamp`   | `timestamp` | Default now                 |

## 6. Ratings & Reviews

| Field        | Type           | Notes                                                          |
| :----------- | :------------- | :------------------------------------------------------------- |
| `id`         | `UUID`         | PK                                                             |
| `provider_id`  | `UUID`         | FK logistics provider                                          |
| `reviewer_did` | `text`         | DID of buyer or seller leaving review                         |
| `rating`       | `decimal(3,2)` | 0.00–5.00                                                      |
| `review`       | `text`         | Optional comment                                               |
| `order_id`     | `UUID`         | Optional link to order                                         |
| `created_at`   | `timestamp`    | Default now                                                    |

*   Average rating calculated as rolling mean across all reviews.
*   Total deliveries count increments per completed shipment.
*   Reviews are optional but recommended for transparency.

## 7. Buyer Override Rules

| Rule                                 | Description                                                                |
| :----------------------------------- | :------------------------------------------------------------------------- |
| Buyer can override seller’s provider | Only if buyer disagrees with default provider choice                         |
| Eligibility                          | Selected provider must be in logistics pool and serve the order region      |
| Restrictions                         | Anonymous buyer → only anonymous providers; KYC buyer → any provider         |
| Risk acknowledgment                  | If buyer chooses provider outside seller preference, seller is notified       |
| Approval Flow                        | Optional: seller may approve override for high-value items                   |

## 8. Integration Points

| Layer   | Integration Role                                                                |
| :------ | :------------------------------------------------------------------------------ |
| Layer 0 | Provider DID verification, integrate ratings into Reputation NFT                 |
| Layer 1 | Transaction anchoring (orders → shipment → proof)                               |
| Layer 2 | Connect payment info for insurance / dispute                                   |
| Layer 4 | Dispute & risk validation                                                        |
| Layer 6 | Governance: rating manipulation prevention, provider compliance                |

## 9. Workflow / Use Cases

1.  Provider registers (KYC or anon).
2.  Seller selects provider from logistics pool.
3.  Buyer may accept seller’s provider or choose their own (override rules).
4.  Provider submits shipping quote.
5.  Seller accepts quote.
6.  Shipment created → tracking number assigned.
7.  Status updates recorded in tracking events (`picked_up` → `in_transit` → `delivered`).
8.  Proof of delivery uploaded (photo/signature hash).
9.  Ratings and reviews recorded post-delivery.
10. Average rating updated and reflected in provider stats & reputation NFT.