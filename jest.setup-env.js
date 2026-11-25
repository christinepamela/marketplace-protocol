/**
 * Test-only environment values for jest.
 *
 * `src/api/index.ts` builds the whole API at import time, and `Config`
 * (`src/api/core/config.ts`) validates its environment in its constructor,
 * against the zod `envSchema`. Any test that imports the app therefore needs a
 * complete environment before the import runs. `health.test.ts` imports the
 * real app on purpose, so the environment is supplied here instead of
 * weakening the schema or stubbing the app.
 *
 * Registered in `jest.config.js` under `setupFiles`, which runs once per test
 * file before the test file's own imports.
 *
 * Every value is assigned unconditionally, never "if missing": a shell that
 * happens to hold real credentials is overwritten, so the tests can never be
 * pointed at a real database or a real service key.
 *
 * Every value below is fake and local. Nothing real belongs in this file.
 *
 * Path: jest.setup-env.js
 */

const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3000',

  // Not a Supabase project. createClient() does not open a connection; no
  // request is made unless a query runs, and these tests only reach /health,
  // /version, the 404 handler and middleware.
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'test-only-anon-key-not-a-real-key',
  SUPABASE_SERVICE_KEY: 'test-only-service-key-not-a-real-key',

  // The schema's minimums: 32 characters for these two, 64 for the proof key.
  JWT_SECRET: 'test-only-jwt-secret-0123456789abcdef',
  API_KEY_SALT: 'test-only-api-key-salt-0123456789abcdef',
  PROOF_SIGNING_KEY:
    'test-only-proof-signing-key-0123456789abcdef0123456789abcdef0123456789ab',
};

Object.keys(TEST_ENV).forEach((key) => {
  process.env[key] = TEST_ENV[key];
});
