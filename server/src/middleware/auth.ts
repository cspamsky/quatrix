import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '../types/index.js';
import db from '../db.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not defined.');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // If no bearer token, check query parameters (useful for direct file downloads)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return res.status(401).json({ message: 'Authentication required' });

  jwt.verify(token, process.env.JWT_SECRET, (err: unknown, decoded: unknown) => {
    if (err) {
      console.warn(
        `[AUTH] Token verification failed: ${err instanceof Error ? err.message : String(err)} - Returning 403`
      );
      return res.status(403).json({
        message: 'Forbidden: Invalid or expired token',
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const user = decoded as User;

    // REAL-TIME SESSION CHECK:
    // Check if the session still exists in the database
    if (user.jti) {
      console.log(
        `[AUTH] Checking session for User: ${user.id} (${typeof user.id}), JTI: ${user.jti}`
      );
      const session = db
        .prepare('SELECT 1 FROM user_sessions WHERE token_id = ? AND user_id = ?')
        .get(user.jti, user.id);
      if (!session) {
        console.warn(
          `[AUTH] Session validation failed for User ID: ${user.id}, Token ID: ${user.jti}`
        );
        return res.status(401).json({ message: 'Session has been terminated or is invalid' });
      }

      // Update last active
      db.prepare('UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE token_id = ?').run(
        user.jti
      );
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - appending to request
    req.user = user;
    next();
  });
};
