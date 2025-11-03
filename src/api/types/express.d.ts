/**
 * Express Type Extensions
 * 
 * Extends Express Request interface with custom properties
 */

import { JwtPayload } from '../core/auth';
import { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: JwtPayload & { did?: string }; // Add did for convenience
      clientId?: string;
      permissions?: string[];
      supabase: SupabaseClient; // Add Supabase client
    }
  }
}

export {};