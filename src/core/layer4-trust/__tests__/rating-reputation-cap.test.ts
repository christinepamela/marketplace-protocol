/**
 * B36 / B41: a rating must land on the real `reputations` row, and must not cap
 * that row's score at 100.
 *
 * The protocol's reputation formula has a maximum of
 * DEFAULT_REPUTATION_PARAMS.maxScore (500). Before B36,
 * `RatingService.updateReputationFromRating` clamped the score to 0-100, so a
 * seller at 300 fell to about 100 after a single rating.
 *
 * These tests drive `submitRating()` -- the public method that
 * `POST /api/ratings` calls (`src/api/routes/rating.routes.ts:81`) -- against a
 * stub Supabase client, then assert on the row actually written to
 * `reputations`. That proves both the arithmetic and the write path.
 *
 * What the stub does NOT prove: it is an in-memory table, not PostgREST. B41 is
 * exactly that gap -- the write used to look the row up by `did`, a column
 * `reputations` does not have, so on the real database the select failed, its
 * error was discarded and a rating wrote nothing at all. The stub now models the
 * table (see SCHEMA): the row holds `vendor_did` only and a filter on a column
 * the table does not have is rejected, so putting a wrong column name back into
 * `rating.service.ts` fails a test here instead of passing quietly.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RatingService } from '../rating.service';
import { DEFAULT_REPUTATION_PARAMS } from '../../layer0-identity/types';

type Row = Record<string, any>;

const NOT_FOUND = { data: null, error: { code: 'PGRST116', message: 'no rows' } };

/**
 * The columns of each table that this path uses. `reputations` is the confirmed
 * real schema: Pam ran the query on `information_schema.columns` in S44 and got
 * `id`, `vendor_did`, `score`, `metrics`, `history`, `recent_events_hash`,
 * `last_updated`. There is no `did`. Anything not in this map is rejected, the
 * way PostgREST rejects it.
 */
const SCHEMA: Record<string, string[]> = {
  orders: ['id', 'status', 'buyer_did', 'vendor_did', 'total'],
  ratings: [
    'id',
    'order_id',
    'buyer_did',
    'vendor_did',
    'transaction_value_sats',
    'buyer_rating',
    'buyer_comment',
    'buyer_categories',
    'buyer_submitted_at',
    'vendor_rating',
    'vendor_comment',
    'vendor_categories',
    'vendor_submitted_at',
    'revealed_at',
    'created_at',
  ],
  reputations: [
    'id',
    'vendor_did',
    'score',
    'metrics',
    'history',
    'recent_events_hash',
    'last_updated',
  ],
};

/**
 * Minimal in-memory stand-in for the Supabase query builder, covering exactly
 * the calls the rating path makes: select/insert/update, eq/is/not, order,
 * single, and awaiting the builder directly.
 *
 * It is deliberately strict about column names: `eq`, `is`, `not` and `order`
 * check the column against SCHEMA and throw otherwise. That is the B41 guard --
 * a wrong column name must fail a test, not find the row by luck.
 */
class FakeQuery implements PromiseLike<{ data: any; error: any }> {
  private filters: Array<(row: Row) => boolean> = [];
  private sort: { column: string; ascending: boolean } | null = null;
  private mode: 'select' | 'insert' | 'update' = 'select';
  private payload: Row | null = null;
  private wantSingle = false;

  constructor(
    private table: string,
    private store: Row[],
    private nextId: () => string,
    private fault: { op: 'select' | 'update'; code: string; message: string } | null = null
  ) {}

  private checkColumn(method: string, column: string): void {
    const columns = SCHEMA[this.table];
    if (!columns.includes(column)) {
      throw new Error(
        `stub: ${this.table} has no column "${column}" (${method}); ` +
          `PostgREST would reject this query`
      );
    }
  }

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
    this.checkColumn('eq', column);
    this.filters.push(row => row[column] === value);
    return this;
  }

  is(column: string, value: unknown): this {
    this.checkColumn('is', column);
    this.filters.push(row => (row[column] ?? null) === value);
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    this.checkColumn('not', column);
    if (operator !== 'is') {
      throw new Error(`stub: unsupported operator "${operator}"`);
    }
    this.filters.push(row => (row[column] ?? null) !== value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.checkColumn('order', column);
    this.sort = { column, ascending: options?.ascending !== false };
    return this;
  }

  single(): this {
    this.wantSingle = true;
    return this;
  }

  private execute(): { data: any; error: any } {
    // A real database error (an unknown column, a permission problem) comes
    // back as an error with no data, not as a thrown exception.
    if (this.fault && this.fault.op === this.mode) {
      return {
        data: null,
        error: { code: this.fault.code, message: this.fault.message },
      };
    }

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

interface StubOptions {
  /** Simulate PostgREST rejecting the `reputations` select, as it does on a bad column. */
  reputationSelectError?: { code: string; message: string };
  /** Simulate PostgREST rejecting the `reputations` update. */
  reputationUpdateError?: { code: string; message: string };
}

function createStubClient(state: StubState, options: StubOptions = {}): SupabaseClient {
  let counter = 0;
  const client = {
    from(table: string) {
      const store = (state as unknown as Record<string, Row[]>)[table];
      if (!store) throw new Error(`stub: unknown table "${table}"`);
      const fault =
        table !== 'reputations'
          ? null
          : options.reputationSelectError
          ? { op: 'select' as const, ...options.reputationSelectError }
          : options.reputationUpdateError
          ? { op: 'update' as const, ...options.reputationUpdateError }
          : null;
      return new FakeQuery(table, store, () => `${table}-${++counter}`, fault);
    },
  };
  return client as unknown as SupabaseClient;
}

const VENDOR = 'did:rangkai:vendor-1';
const BUYER = 'did:rangkai:buyer-1';
const ORDER = 'order-1';

/**
 * The `reputations` row carries the real columns and nothing else (confirmed
 * S44). It has `vendor_did`; it has no `did`, and the stub rejects a filter on a
 * column the table does not have, which is what makes the old `.eq('did', ...)`
 * lookup fail here instead of passing.
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
        id: 'reputation-1',
        vendor_did: VENDOR,
        score,
        metrics: {
          transactionsCompleted: 3,
          averageRating: 4.8,
          minorDisputes: 0,
          majorDisputes: 0,
        },
        history: [],
        recent_events_hash: null,
        last_updated: '2026-11-20T00:00:00.000Z',
      },
    ],
  };
}

const BUYER_RATING = {
  order_id: ORDER,
  rater_did: BUYER,
  rater_type: 'buyer' as const,
};

async function rateVendor(score: number, rating: number): Promise<StubState> {
  const state = makeState(score);
  const service = new RatingService(createStubClient(state));

  await service.submitRating({ ...BUYER_RATING, rating });

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
    // Identified the way the table identifies it. `did` was B41.
    expect(state.reputations[0].vendor_did).toBe(VENDOR);
    // The metrics write on the same row is existing behaviour and must survive.
    expect(state.reputations[0].metrics).toHaveProperty('average_rating');
  });

  it('does nothing when the vendor has no reputation record', async () => {
    const state = makeState(300);
    state.reputations = [];
    const service = new RatingService(createStubClient(state));

    await expect(
      service.submitRating({ ...BUYER_RATING, rating: 5 })
    ).resolves.toBeDefined();
    expect(state.reputations).toHaveLength(0);
  });
});

describe('B41 the reputation write uses a column the table has', () => {
  it('models the real table: the stub rejects a filter on a column reputations does not have', () => {
    // This is the guard that makes the next test meaningful. If the stub
    // accepted `did` again, the old lookup would find the row and pass.
    const client = createStubClient(makeState(300)) as any;

    expect(() => client.from('reputations').select('*').eq('did', VENDOR)).toThrow(
      /reputations has no column "did"/
    );
  });

  it('finds the row by vendor_did, so a rating moves the score', async () => {
    // With the old `.eq('did', ...)` code this call rejects: the stub has no
    // `did` column, so no score is written and the test fails visibly. On the
    // real database it failed the same way, silently, which is B41.
    const state = await rateVendor(300, 5);

    expect(state.reputations[0].score).toBe(301);
    expect(state.reputations[0].vendor_did).toBe(VENDOR);
  });

  it('fails the rating loudly when the reputation lookup errors, instead of writing nothing', async () => {
    // What the real database did: an error on the select. The error used to be
    // discarded, so `reputation` was null and the function returned early,
    // leaving the rating with no effect and no signal.
    const state = makeState(300);
    const service = new RatingService(
      createStubClient(state, {
        reputationSelectError: {
          code: '42703',
          message: 'column reputations.did does not exist',
        },
      })
    );

    await expect(
      service.submitRating({ ...BUYER_RATING, rating: 5 })
    ).rejects.toThrow(/Failed to load reputation for did:rangkai:vendor-1/);
    expect(state.reputations[0].score).toBe(300);
  });

  it('fails the rating loudly when the reputation update errors', async () => {
    const state = makeState(300);
    const service = new RatingService(
      createStubClient(state, {
        reputationUpdateError: {
          code: '42703',
          message: 'column reputations.did does not exist',
        },
      })
    );

    await expect(
      service.submitRating({ ...BUYER_RATING, rating: 5 })
    ).rejects.toThrow(/Failed to update reputation for did:rangkai:vendor-1/);
    expect(state.reputations[0].score).toBe(300);
  });
});
