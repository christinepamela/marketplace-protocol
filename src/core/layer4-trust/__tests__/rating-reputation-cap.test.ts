/**
 * B36: a rating must not cap the reputation score at 100.
 *
 * The protocol's reputation formula has a maximum of
 * DEFAULT_REPUTATION_PARAMS.maxScore (500). Before this fix,
 * `RatingService.updateReputationFromRating` clamped the score to 0-100, so a
 * seller at 300 fell to about 100 after a single rating.
 *
 * These tests drive `submitRating()` -- the public method that
 * `POST /api/ratings` calls (`src/api/routes/rating.routes.ts:81`) -- against a
 * stub Supabase client, then assert on the row actually written to
 * `reputations`. That proves both the arithmetic and the write path.
 *
 * What the stub does NOT prove: it is an in-memory table, not PostgREST, so it
 * says nothing about the real column names (see the `did` / `vendor_did`
 * mismatch, tracked as B41) or about the filter grammar.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RatingService } from '../rating.service';
import { DEFAULT_REPUTATION_PARAMS } from '../../layer0-identity/types';

type Row = Record<string, any>;

const NOT_FOUND = { data: null, error: { code: 'PGRST116', message: 'no rows' } };

/**
 * Minimal in-memory stand-in for the Supabase query builder, covering exactly
 * the calls the rating path makes: select/insert/update, eq/is/not, order,
 * single, and awaiting the builder directly.
 */
class FakeQuery implements PromiseLike<{ data: any; error: any }> {
  private filters: Array<(row: Row) => boolean> = [];
  private sort: { column: string; ascending: boolean } | null = null;
  private mode: 'select' | 'insert' | 'update' = 'select';
  private payload: Row | null = null;
  private wantSingle = false;

  constructor(
    private store: Row[],
    private nextId: () => string
  ) {}

  select(): this {
    return this;
  }

  insert(payload: Row): this {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push(row => row[column] === value);
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push(row => (row[column] ?? null) === value);
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    if (operator !== 'is') {
      throw new Error(`stub: unsupported operator "${operator}"`);
    }
    this.filters.push(row => (row[column] ?? null) !== value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.sort = { column, ascending: options?.ascending !== false };
    return this;
  }

  single(): this {
    this.wantSingle = true;
    return this;
  }

  private execute(): { data: any; error: any } {
    if (this.mode === 'insert') {
      const row = { id: this.nextId(), ...this.payload };
      this.store.push(row);
      return { data: this.wantSingle ? row : [row], error: null };
    }

    let rows = this.store.filter(row => this.filters.every(fn => fn(row)));

    if (this.mode === 'update') {
      rows.forEach(row => Object.assign(row, this.payload));
      return { data: this.wantSingle ? rows[0] ?? null : rows, error: null };
    }

    if (this.sort) {
      const { column, ascending } = this.sort;
      rows = [...rows].sort((a, b) => {
        if (a[column] === b[column]) return 0;
        return (a[column] < b[column] ? -1 : 1) * (ascending ? 1 : -1);
      });
    }

    if (this.wantSingle) {
      return rows.length === 1 ? { data: rows[0], error: null } : NOT_FOUND;
    }

    return { data: rows, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

interface StubState {
  orders: Row[];
  ratings: Row[];
  reputations: Row[];
}

function createStubClient(state: StubState): SupabaseClient {
  let counter = 0;
  const client = {
    from(table: string) {
      const store = (state as unknown as Record<string, Row[]>)[table];
      if (!store) throw new Error(`stub: unknown table "${table}"`);
      return new FakeQuery(store, () => `${table}-${++counter}`);
    },
  };
  return client as unknown as SupabaseClient;
}

const VENDOR = 'did:rangkai:vendor-1';
const BUYER = 'did:rangkai:buyer-1';
const ORDER = 'order-1';

/**
 * The `reputations` row carries both `did` and `vendor_did` because
 * `updateReputationFromRating` looks it up by `did` while every other site in
 * the codebase uses `vendor_did`. Which one the real table has is unverified
 * (it needs the database); that mismatch is B41, not this item.
 */
function makeState(score: number): StubState {
  return {
    orders: [
      {
        id: ORDER,
        status: 'completed',
        buyer_did: BUYER,
        vendor_did: VENDOR,
        total: { amount: 2500 },
      },
    ],
    ratings: [],
    reputations: [
      {
        did: VENDOR,
        vendor_did: VENDOR,
        score,
        metrics: {
          transactionsCompleted: 3,
          averageRating: 4.8,
          minorDisputes: 0,
          majorDisputes: 0,
        },
      },
    ],
  };
}

async function rateVendor(score: number, rating: number): Promise<StubState> {
  const state = makeState(score);
  const service = new RatingService(createStubClient(state));

  await service.submitRating({
    order_id: ORDER,
    rater_did: BUYER,
    rater_type: 'buyer',
    rating,
  });

  return state;
}

describe('B36 reputation score cap', () => {
  it('keeps the maximum at 500, as the protocol formula states', () => {
    // Pinned on purpose: the cap must follow the formula's maximum, and the
    // protocol's agreed maximum is 500. If this changes, both move together.
    expect(DEFAULT_REPUTATION_PARAMS.maxScore).toBe(500);
  });

  it('keeps a 300 score above 100 after a five-star rating', async () => {
    const state = await rateVendor(300, 5);

    // +1 for a rating of 4 or more. The old clamp gave 100 here.
    expect(state.reputations[0].score).toBe(301);
    expect(state.reputations[0].score).toBeGreaterThan(100);
  });

  it('takes two points off a 300 score for a one-star rating, not 200', async () => {
    const state = await rateVendor(300, 1);

    expect(state.reputations[0].score).toBe(298);
  });

  it('stops at the formula maximum, not above it', async () => {
    const state = await rateVendor(DEFAULT_REPUTATION_PARAMS.maxScore - 1, 5);

    expect(state.reputations[0].score).toBe(DEFAULT_REPUTATION_PARAMS.maxScore);
  });

  it('never goes below zero', async () => {
    const state = await rateVendor(1, 1);

    expect(state.reputations[0].score).toBe(0);
  });

  it('writes the score on the vendor record through submitRating', async () => {
    const state = await rateVendor(300, 5);

    expect(state.reputations).toHaveLength(1);
    expect(state.reputations[0].did).toBe(VENDOR);
    // The metrics write on the same row is existing behaviour and must survive.
    expect(state.reputations[0].metrics).toHaveProperty('average_rating');
  });

  it('does nothing when the vendor has no reputation record', async () => {
    const state = makeState(300);
    state.reputations = [];
    const service = new RatingService(createStubClient(state));

    await expect(
      service.submitRating({
        order_id: ORDER,
        rater_did: BUYER,
        rater_type: 'buyer',
        rating: 5,
      })
    ).resolves.toBeDefined();
    expect(state.reputations).toHaveLength(0);
  });
});
