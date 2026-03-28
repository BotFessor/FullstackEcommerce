import { pgTable,serial, varchar  } from "drizzle-orm/pg-core";

export const pinoLoggerTable = pgTable('security_logs ',{
    id : serial('id').primaryKey().notNull(),
    ip : varchar('ip',{length: 50}),
    level: varchar('level',{length: 50}),
    method: varchar('method',{length: 50}),
    endpoint: varchar('endpoint',{length:200}),
    attack_type: varchar('attack_type',{length:255}),
    payload_hash: varchar('payload_hash',{length:255}),
    msg: varchar('msg', { length: 255 }),
    reason: varchar('reason', { length: 255 }),
    userAgent: varchar('userAgent', { length: 255 }),

});