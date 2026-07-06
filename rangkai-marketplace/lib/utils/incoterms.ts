import type { IncotermType } from '@rangkai/sdk'

/**
 * Plain-language buyer explanations for Incoterms.
 * Sellers and logistics providers understand "DAP" / "DDP" natively —
 * buyers generally don't. This translates the code into what it actually
 * means for them at the point of delivery: what arrives, who pays what.
 */
const INCOTERM_BUYER_EXPLANATIONS: Record<IncotermType, string> = {
  DAP: 'Delivered to your door. You pay any import duties or taxes when it arrives.',
  DDP: 'Fully delivered — shipping and all import duties are already included in the price.',
  FOB: "Seller ships to their local port. You (or your freight forwarder) arrange and pay for the journey from there to your door.",
  EXW: "You arrange everything — pickup from the seller's location, shipping, customs, and final delivery."
}

export function getIncotermExplanation(incoterm: IncotermType): string {
  return INCOTERM_BUYER_EXPLANATIONS[incoterm] || ''
}