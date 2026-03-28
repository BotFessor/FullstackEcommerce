import { logger } from "./logger";
import crypto from "crypto";

export function hashPayload(payload: unknown) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
}

export function logAttack(req: Request, reason: string) {
    logger.warn({
        msg: "Attack detected",
        method: req.method,
        reason,
        endpoint: req.url,
        attack_type: reason,
        payload_hash:hashPayload(req.body) ,
    });
}