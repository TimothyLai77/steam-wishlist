import type { Request, Response, NextFunction } from "express";

/**
 * Generic error class with an optional HTTP status, public message, and
 * stable machine-readable code (e.g. `WISHLIST_NOT_PUBLIC`) that clients
 * can switch on without parsing the message text.
 */
export class AppError extends Error {
    constructor(
        public readonly statusCode: number = 500,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
        this.name = "AppError";
    }
}

/**
 * Catch-all error handler. Logs the error and sends a safe JSON response.
 */
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    const statusCode = (err instanceof AppError ? err.statusCode : 500) as number;
    const message = process.env.NODE_ENV === "production" && !(err instanceof AppError)
        ? "Internal Server Error"
        : err.message;

    console.error(`[Error] ${statusCode} ${message}`, err.stack ?? err);

    res.status(statusCode).json({
        error: message,
        ...(err instanceof AppError && err.code ? { code: err.code } : {}),
    });
};
