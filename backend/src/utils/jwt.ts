import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as StringValue;

export const signToken = (payload: { userId: string; username: string }): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): jwt.JwtPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
        return null;
    }
};
