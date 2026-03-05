/**
 * Express error handling middleware.
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ApiError extends Error {
    statusCode?: number;
    details?: unknown;
}

/**
 * Global error handler for Express 5.
 */
export function errorHandler(
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: "Validation failed",
            details: err.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
            })),
        });
        return;
    }

    // Custom API errors with status code
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    console.error(`[ERROR] ${statusCode}: ${message}`, err);

    const response: { error: string; details?: unknown } = { error: message };
    if (err.details) {
        response.details = err.details;
    }
    res.status(statusCode).json(response);
}

/**
 * Create a typed API error.
 */
export function createError(
    message: string,
    statusCode: number = 500,
    details?: unknown
): ApiError {
    const err = new Error(message) as ApiError;
    err.statusCode = statusCode;
    err.details = details;
    return err;
}
