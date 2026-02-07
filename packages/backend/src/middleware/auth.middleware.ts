import { Request, Response, NextFunction } from 'express';

// Augment Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Default user ID for development (no login required)
// In production, you could use an environment variable or database lookup
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'default-dev-user';

/**
 * Auth bypass middleware for development.
 * Assigns a default userId to all requests, removing the need for login.
 * 
 * Note: This is for development/demo purposes only.
 * For production with authentication, restore the JWT validation logic.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Assign default user ID - no authentication required
  req.userId = DEFAULT_USER_ID;
  next();
}
