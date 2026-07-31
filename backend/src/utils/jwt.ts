import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

export interface JwtPayload {
    userId: string;
    username: string;
}

export const signToken = (payload: JwtPayload): string => {
    const secret = process.env.JWT_SECRET as string;
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as StringValue;
    return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload | null => {
    try {
        const secret = process.env.JWT_SECRET as string;
        return jwt.verify(token, secret) as JwtPayload;
    } catch {
        return null;
    }
};
