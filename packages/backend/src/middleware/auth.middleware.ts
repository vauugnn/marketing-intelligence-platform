import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Augment Express Request type to include userId and userEmail
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Auth middleware that validates Supabase JWT tokens.
 * Extracts the Bearer token from the Authorization header and
 * validates it via Supabase's auth.getUser().
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
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
