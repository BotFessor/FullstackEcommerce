/**
 * NOTE:
 * JavaScript runtime prototype mutations (e.g. obj.__proto__)
 * cannot be detected via HTTP payload.
 *
 * This middleware protects against: HTTP attacks
 * - Raw payload attacks
 * - Encoded attacks
 * - qs / form attacks
 * - Deep object injection
 * THE FLOW IS: 
 RAW BODY (string)
   ↓
detectRawPrototypePollution ✅
   ↓
express parses JSON
   ↓
validateRequest middleware
   ↓
0️⃣ raw flag check
1️⃣ hasDangerousKeysDeep (object level)
2️⃣ safeClone + safePlainObject
3️⃣ content-type checks
4️⃣ Zod
 */
/**
 * THIS IS A 3-LEVEL LAYERED DEFENSE
 * 🛡️ Layer 1 — RAW (string level)
Catches:
-> __proto__
-> encoded attacks %5F%5Fproto%5F%5F
-> unicode tricks
-> duplicate key payloads
-> polyglots

🛡️ Layer 2 — Object (your existing guard)
Catches:
-> getters
-> non-enumerables
-> runtime mutation
-> deep nesting
-> arrays / constructor tricks

🛡️ Layer 3 — Validation (Zod)
Catches:
-> wrong schema
-> missing fields
-> type issues

NB: You are NOT “forcing raw through”, 👉 You are just observing it briefly before parsing. This is->safe, standard practice, used in high-security APIs (Stripe, Shopify, etc.).
SUMMARY:

                                Attacker sends payload
                                            ↓
                                RAW detector → "malicious?" → YES → 400 ✅
                                            ↓
                                           else
                                            ↓
                                Parsed safely 
                                            ↓
                                Object guard → "polluted?" → YES → 400 ✅
                                            ↓
                                           else
                                            ↓
                                Zod → "invalid schema?" → YES → 422 ✅
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { hasDangerousKeysDeep, hasRawDangerousPatterns, hasSuspiciousEmptyStructures, safeClone, safePlainObject } from '@/utils/security/antiPrototypePollution/ppGuard'; 

type RequestSchema = {
    body?: unknown;
    params?: unknown;
    query?: unknown;
};

type ValidationOptions = {
    allowFormData?: boolean;
    allowText?: boolean;
    allowFileUpload?: boolean;
};

export function validateRequest<T extends RequestSchema>(
    schema: z.ZodType<T>,
    options: ValidationOptions = {}
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        //console.log("RAW BODY:", (req as any).rawBody);
        
        try {
            // ===== 0️⃣ RAW attack detection (NEW - STRONG) =====
            const raw = (req as any).rawBody;

            if (raw && hasRawDangerousPatterns(raw)) {
                return res.status(400).json({
                    success: false,
                    message: "Rejected: malicious payload detected",
                });
            }
            // ===== 1️⃣ Prototype Pollution Defense on RAW input =====
            // 🔥 EXTRA: query string raw scan
            if (req.url && hasRawDangerousPatterns(req.url)) {
                return res.status(400).json({
                    success: false,
                    message: "Rejected: malicious query",
                });
            }
            if (
                hasDangerousKeysDeep(req.body) ||
                hasDangerousKeysDeep(req.params) ||
                hasDangerousKeysDeep(req.query)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Rejected: invalid input",
                });
            }
            // ===== Detect stripped prototype attacks =====
            if (
                hasSuspiciousEmptyStructures(req.body) ||
                hasSuspiciousEmptyStructures(req.query) ||
                hasSuspiciousEmptyStructures(req.params)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Rejected: suspicious payload structure",
                });
            }

            // ===== 2️⃣ Safe clone + plain object AFTER guard =====
            const safeInput = {
                body: safePlainObject(safeClone(req.body)),
                params: safePlainObject(safeClone(req.params)),
                query: safePlainObject(safeClone(req.query)),
            };

            // ===== 3️⃣ Content-Type / Method checks =====
            const contentType = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
            const isJson = contentType === "application/json";
            const isForm = contentType === "application/x-www-form-urlencoded";
            const isText = contentType === "text/plain";
            const isUpload = contentType === "multipart/form-data";
            //Block multipart early
            if (isUpload && !options.allowFileUpload) {
                return res.status(400).json({
                    success: false,
                    message: "File uploads not allowed",
                });
            }

            const methodsRequiringBody = ["POST", "PATCH", "PUT"];
            if (methodsRequiringBody.includes(req.method)) {
                const allowed =
                    isJson ||
                    (options.allowFormData && isForm) ||
                    (options.allowText && isText) ||
                    (options.allowFileUpload && isUpload);

                if (!allowed) {
                    return res.status(400).json({
                        success: false,
                        message: "Unsupported Content-Type",
                    });
                }
            }

            // Extra strict check for forms
            if (isForm && typeof safeInput.body === "object" && safeInput.body !== null) {
                const suspiciousPatterns = ["__proto__", "constructor", "prototype"];
                const rawKeys = Object.keys(safeInput.body);
                for (const key of rawKeys) {
                    const normalizedKey = key
                        .normalize("NFKC")
                        .toLowerCase();

                    if (suspiciousPatterns.some(p => normalizedKey.includes(p))) {
                        return res.status(400).json({
                            success: false,
                            message: "Rejected: invalid data",
                        });
                    }
                }
            }
            // ===== 4️⃣ Zod validation =====
            const validatedData = schema.parse(safeInput);

            // ===== 5️⃣ Empty body & stripped attack detection =====
            const isPlainObject = (val: unknown): val is Record<string, unknown> =>
                typeof val === "object" && val !== null && !Array.isArray(val);

            const isEmptyObject = (val: unknown): val is Record<string, unknown> =>
                isPlainObject(val) && Object.keys(val).length === 0;

            // 🚨 CRITICAL: Detect prototype-stripped attacks
            if (
                methodsRequiringBody.includes(req.method) &&
                isEmptyObject(req.body) &&
                typeof (req as any).rawBody === "string" &&
                (req as any).rawBody.trim() !== "" &&
                (req as any).rawBody !== "{}"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Rejected: suspicious payload",
                });
            }


            if (
                methodsRequiringBody.includes(req.method) &&
                validatedData.body !== undefined &&
                isEmptyObject(validatedData.body) &&
                Object.keys(validatedData.body).length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Request body cannot be empty",
                });
            }

            req.validated = validatedData;
            return next();
        } catch (err) {
            if (err instanceof ZodError) {
                const errorMessages = err.issues.reduce((acc, issue) => {
                    const key = issue.path.length ? issue.path.join('.') : "_root";
                    if (!acc[key]) acc[key] = [];
                    if (issue.code === "unrecognized_keys") {
                        acc[key].push(`Extra fields not allowed: ${issue.keys.join(", ")}`);
                    } else {
                        acc[key].push(issue.message);
                    }
                    return acc;
                }, {} as Record<string, string[]>);

                return res.status(422).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errorMessages
                });
            } else {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };
}