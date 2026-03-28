import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { hasDangerousKeysDeep, safeClone, safePlainObject } from '@/utils/antiPrototypePollution/ppGuard';
import { logAttack } from '@/utils/pinoLogger'; //pino Logger

//1. define type
type RequestSchema = {
    body?: unknown;
    params?: unknown;
    query?: unknown;
};
//2. Optional Guard settings default is application/json but we want to support forms & Webhooks & File Uploads
type ValidationOptions = {
    allowFormData?: boolean; //working with forms
    allowText?: boolean; // for cetain webhooks
    allowFileUpload?: boolean; // file uploads
};

export function validateRequestMiddleware<T extends RequestSchema>(schema: z.ZodType<T>, options: ValidationOptions = {}): RequestHandler  {  //Higher order function
    return (req: Request, res: Response, next: NextFunction) => {

        //console.log("CONTENT-TYPE:", req.headers["content-type"]);
        //console.log("RAW BODY BEFORE PARSE:", req.body);
        try {
            //#####Global Guard to prevent Prototype Pollution
            // 1. Prototype Pollution Protection (Detection + Sanitization)
            // Aa. Detect malicious input BEFORE doing anything
            
            //To handle req.query properly, apply through safePlainObject
            const safeBody = safePlainObject(req.body);
            const safeParams = safePlainObject(req.params);
            const safeQuery = safePlainObject(req.query); // 🔥 important
            const sources = [safeBody, safeParams, safeQuery];
            for (const src of sources) {
                if (hasDangerousKeysDeep(src)) {
                    //add pino logging here
                    return res.status(400).json({
                        success: false,
                        message: "Rejected: invalid input",
                    });
                }
            }
            // B. Sanitize input SAFELY using safeClone (without mutating original req)
            const safeInput = {
                body: safeClone(req.body),
                params: safeClone(req.params),
                query: safeClone(req.query),
            };
            //2. Take security Measures as regards header  Content-Types.
            const contentType = req.headers["content-type"] || "";
            //Attackers can send:
            // application/json-malicious
            // application / json; charset = evil
            // so Use strict parsing:
            const type = contentType.split(";")[0].trim().toLowerCase();
            const isJson = type === "application/json"; //most common + webhooks etc
            const isForm = type === "application/x-www-form-urlencoded";   //user forms
            const isText = type === "text/plain";  //some webhooks that need text/plain
            const isUpload = type === "multipart/form-data";   //file uploads
            // Add a pre-validation guard for urlencoded ONLY (tight integration). Intercept Prototype pollution attacks from user submitted forms.
            // Extra strict check for qs-style attacks
            if (isForm && typeof req.body === "object" && req.body !== null) {
                const suspiciousPatterns = [
                    "__proto__",
                    "constructor",
                    "prototype"
                ];
                const rawKeys = Object.keys(req.body);
                for (const key of rawKeys) {
                    if (suspiciousPatterns.some(p => key.includes(p))) {
                        //add pino logging
                        return res.status(400).json({
                            success: false,
                            message: "Suspicious form input detected",
                        });
                    }
                }
            }
            //Enforce to prevent sending empty body or {}
            const methodsRequiringBody = ["POST", "PATCH", "PUT"];
            if (methodsRequiringBody.includes(req.method)) {
                const allowed =
                    isJson ||                            //"application/json" ->allowed by default
                    (options.allowFormData && isForm) || //"application/x-www-form-urlencoded"->only if: true      
                    (options.allowText && isText) ||     //"text/plain" -> allowed only if set to: true
                    (options.allowFileUpload && isUpload); //"multipart/form-data" -> allowed only if set to: true
                if (!allowed) {
                    //add pino logging
                    return res.status(400).json({
                        success: false,
                        message: "Unsupported Content-Type",
                    });
                }
            }
            //3. Parse data - zod checks if data matches schema definitions otherwise throw new Error() 
            const sanitizedData = schema.parse(safeInput);
            //4. Prevent empty body
            const isEmptyObject = (val: unknown): val is Record<string, unknown> =>
                typeof val === "object" && val !== null && !Array.isArray(val);
            if (
                methodsRequiringBody.includes(req.method) &&
                sanitizedData.body !== undefined &&
                isEmptyObject(sanitizedData.body) &&
                Object.keys(sanitizedData.body).length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Request body cannot be empty",
                });
            }
            // attach sanitizedData to request Object, for use in controllers
            req.validated = sanitizedData;
            
            //Call the next middleware
            return next();

        } catch (err) {
            if (err instanceof ZodError) {   
                /**Dealing with multiple errors per field  */
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
                /**Multiple errors End Here */
                return res.status(422).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errorMessages
                });
            } else {
                return res.status(500).json({ error: 'Internal Server Error' });
                //Pino logging here
            }
        }
    };
}

/**
 * Sanitize first → validate → trust only req.validated
 WHAT THIS FILE DOES
 1.  Incoming request
   ↓
2. Deep detection (blocks attack)
   ↓
3. Safe clone (removes prototype chain)
   ↓
4. Zod validation (strict structure)
   ↓
5. req.validated = sanitizedData 

-> You never trust req.body again
-> Controllers only see clean, prototype-free data

#Works for ALL content types you support
-application/json 
-x-www-form-urlencoded  ~(important)
-text/plain (if parsed) 
-multipart/form-data (fields part) 
 */