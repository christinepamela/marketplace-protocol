/**
 * Express Type Extensions
 * 
 * Extends Express Request interface with custom properties
 */

import { JwtPayload } from '../core/auth';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: JwtPayload;
      clientId?: string;
      permissions?: string[];
    }
  }
}

export {};