import { doublePrecision, pgTable, serial, varchar, text } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products",{
id : serial('id').primaryKey().notNull(),
name: varchar('name',{ length: 255 }),
description : text('description'),
image : varchar('image_url',{length:255}),
price: doublePrecision('price').notNull().default(0.00)
});