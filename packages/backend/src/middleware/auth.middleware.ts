import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Augment Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Supabase Auth middleware.
 * Extracts the JWT from the Authorization header, verifies it via Supabase,
 * and attaches the user ID to the request.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
