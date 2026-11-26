/**
 * B46: `JwtPayload` must describe the payloads that are really signed.
 *
 * `identity.routes.ts` puts `clientId` into every token it signs (lines 154,
 * 171, 233, 245 and 305), but `JwtPayload` did not declare it, so code reading
 * `req.user?.clientId` could not typecheck even though the value is in the
 * token. ts-jest type-checks this file, so the payload literal below fails
 * before the fix (TS2353, `clientId` is not a known property) and passes after.
 *
 * The second test documents and checks the runtime half of that claim: the
 * field survives signing and verification, so "every signed token carries it"
 * is tested rather than assumed.
 */
import { TokenManager, type JwtPayload } from '../core/auth';

describe('JwtPayload (B46)', () => {
  it('declares the clientId that every signed token carries', () => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: 'did:rangkai:test-b46',
      type: 'kyc',
      clientId: 'rangkai-marketplace',
    };

    expect(payload.clientId).toBe('rangkai-marketplace');
  });

  it('carries clientId through signing and verification', () => {
    const token = TokenManager.generateToken({
      sub: 'did:rangkai:test-b46',
      type: 'kyc',
      clientId: 'rangkai-marketplace',
    });

    expect(TokenManager.verifyToken(token).clientId).toBe(
      'rangkai-marketplace'
    );
  });
});
