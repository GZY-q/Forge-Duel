import "dotenv/config";

export const PORT = process.env.PORT || 8080;
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/forge-duel";
export const SESSION_SECRET = process.env.SESSION_SECRET || "forgeduel-dev-secret-change-in-production";
export const JWT_EXPIRES_IN = "7d";
export const TURN_SECRET = process.env.TURN_SECRET || "forgeduel-turn-secret";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
