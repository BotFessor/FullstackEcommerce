import { neon } from "@neondatabase/serverless";
import {drizzle} from "drizzle-orm/neon-http";
import * as schema from "./schema"

if(!process.env.DATABASE_URL){
    throw new Error('Connection string not found');
}
//creat a connection object
const sql = neon(process.env.DATABASE_URL);

//Create a db instance
export const db = drizzle({
    client : sql,
    schema
});