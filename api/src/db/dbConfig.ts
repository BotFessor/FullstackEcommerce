import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";   //from schema/index.ts

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
    if (dbInstance) return dbInstance;

    if (!process.env.DATABASE_URL) {
        if (process.env.NODE_ENV === "test") {
            // Return a dummy object for tests i.e Jest etc
            // Without this Tests can hit real Database and cause Data loss
            return {} as any;
        }

        throw new Error("Connection string not found");
    }

    const sql = neon(process.env.DATABASE_URL);

    dbInstance = drizzle({
        client: sql,
        schema,
    });

    return dbInstance;
}