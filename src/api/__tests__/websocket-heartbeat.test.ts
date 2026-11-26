/**
 * WebSocket heartbeat lifetime (B49)
 *
 * Importing `src/api/index.ts` builds the WebSocket manager, whose constructor
 * starts a 30-second heartbeat interval (`websocket/server.ts`, `startHeartbeat`).
 * If that timer is not unref'd, the timer alone keeps the Node process alive
 * after the work is done: `npm test` ends with "A worker process has failed to
 * exit gracefully and has been force exited", and a run of a single test file
 * without `--forceExit` never exits at all.
 *
 * In production the listening HTTP server keeps the process alive, so unref'ing
 * the timer changes nothing outside tests.
 */

import { wsManager } from '../index';

describe('WebSocket heartbeat (B49)', () => {
  it('should not hold the process open', () => {
    // `heartbeatInterval` is private to WebSocketManager. The class is not
    // changed to expose it for a test: this reads the same handle that
    // production holds.
    const manager = wsManager as unknown as {
      heartbeatInterval?: NodeJS.Timeout;
    };

    expect(manager.heartbeatInterval).toBeDefined();
    expect(manager.heartbeatInterval!.hasRef()).toBe(false);
  });
});
