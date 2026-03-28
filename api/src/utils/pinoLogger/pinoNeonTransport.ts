import { Level } from './../../../node_modules/pino/pino.d';
import { db } from "@/db";
import { pinoLoggerTable } from "@/db/schema";


export default async function (log: any) {
    if (log.level < 40) return; // only warnings+

    await 
        db.insert(pinoLoggerTable).values({
            level: log.level,
            msg: log.message
            });
    ;
}