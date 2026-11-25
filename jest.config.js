/**
 * Root Jest config.
 *
 * Until now there was none, so `npm test` could not parse TypeScript at all:
 * every .test.ts under src/ failed with "Cannot use import statement outside a
 * module". This is the minimum that makes the existing tests run.
 *
 * The SDK keeps its own config in packages/sdk/jest.config.js.
 *
 * Path: jest.config.js
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // B38: test-only environment values, for the suites that import the whole
  // API. `setupFiles` runs before the test file's imports, which is when
  // `Config` validates the environment (src/api/core/config.ts).
  setupFiles: ['<rootDir>/jest.setup-env.js'],
};
