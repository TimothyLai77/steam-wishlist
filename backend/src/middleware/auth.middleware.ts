import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

// Extend Express Request to attach user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                username: string;
            };
        }
    }
}

/**
 * Protects a route — requires a valid Bearer JWT token.
 * Attaches decoded user payload to `req.user`, or returns 401.
 */
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    // Check for Bearer token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.slice(7).trim();
    if (!token) {
        res.status(401).json({ error: "Unauthorized: Invalid token format" });
        return;
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
        return;
    }

    // Attach user to request
    req.user = payload;
    next();
};
