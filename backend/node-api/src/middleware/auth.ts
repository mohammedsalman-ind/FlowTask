import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase.js';
import type { User } from '@supabase/supabase-js';

/**
 * Extend the Express Request interface to include the authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      /** The authenticated Supabase user. Set by the auth middleware. */
      user?: User;
      /** The raw access token from the Authorization header. */
      accessToken?: string;
    }
  }
}

/**
 * Authentication middleware.
 *
 * Extracts the JWT from the Authorization header (Bearer <token>),
 * verifies it against Supabase Auth, and attaches the user to req.user.
 *
 * Returns 401 if no token is provided, or 403 if the token is invalid.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      data: null,
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      status: 401,
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      data: null,
      error: 'No token provided',
      status: 401,
    });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(403).json({
        data: null,
        error: 'Invalid or expired token',
        status: 403,
      });
      return;
    }

    // Attach user and token to request for downstream use
    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      data: null,
      error: 'Internal authentication error',
      status: 500,
    });
  }
}
