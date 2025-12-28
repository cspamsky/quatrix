import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new ApiError(401, 'Please log in to access this resource');
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Add user info to request
            (req as any).user = decoded;

            next();
        } catch (error) {
            throw new ApiError(401, 'Invalid or expired token. Please log in again.');
        }
    } catch (error) {
        next(error);
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const userRole = (req as any).user?.role;

        if (!roles.includes(userRole)) {
            return next(
                new ApiError(403, `User role '${userRole}' is not authorized to access this route`)
            );
        }
        next();
    };
};
