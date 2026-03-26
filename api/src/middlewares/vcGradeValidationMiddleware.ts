import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { hasDangerousKeysDeep, safeClone } from '@/utils/antiPrototypePollution/fightPrototypePollution';

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

export function validateRequest<T extends RequestSchema>(schema: z.ZodType<T>, options: ValidationOptions = {}): RequestHandler  {
    return (req: Request, res: Response, next: NextFunction) => {

        //console.log("CONTENT-TYPE:", req.headers["content-type"]);
        //console.log("RAW BODY BEFORE PARSE:", req.body);
        try {
            //#####Global Guard to prevent Prototype Pollution
            // 1. Prototype Pollution Protection (Detection + Sanitization)
            // A. Detect malicious input BEFORE doing anything
            const sources = [req.body, req.params, req.query];

            for (const src of sources) {
                if (hasDangerousKeysDeep(src)) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        success: false,
                        message: "Rejected: invalid input",
                    });
                }
            }
            // B. Sanitize input SAFELY (without mutating original req)
            const safeInput = {
                body: safeClone(req.body),
                params: safeClone(req.params),
                query: safeClone(req.query),
            };
            //End weeding prototypes
            //2. Start Schema Validation
            const sanitizedData = schema.parse(safeInput);
            //==End Schema Validation

            //3. Take security Measures as regards header  Content-Types.
            const contentType = req.headers["content-type"] || "";

            const isJson = contentType.includes("application/json");       //most common + webhooks etc
            const isForm = contentType.includes("application/x-www-form-urlencoded");   //user forms
            const isText = contentType.includes("text/plain");         //some webhooks that need text/plain
            const isUpload = contentType.includes("multipart/form-data");   //file uploads

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
                        return res.status(StatusCodes.BAD_REQUEST).json({
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
                    return res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE).json({
                        success: false,
                        message: "Unsupported Content-Type",
                    });
                }
            }
            //Prevent empty body
            const isEmptyObject = (val: unknown): val is Record<string, unknown> =>
                typeof val === "object" && val !== null && !Array.isArray(val);
            if (
                methodsRequiringBody.includes(req.method) &&
                sanitizedData.body !== undefined &&
                isEmptyObject(sanitizedData.body) &&
                Object.keys(sanitizedData.body).length === 0
            ) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Request body cannot be empty",
                });
            }
            // attach sanitizedData to request Object, for use in controllers
            req.validated = sanitizedData;
            

            //Call the next middleware
            return next();

        } catch (err) {
            //return console.log(err);
            if (err instanceof ZodError) {   
                   
                    /**Dealing with multiple errors per field  */
                const errorMessages = err.issues.reduce((acc, issue) => {
                    const key = issue.path.length ? issue.path.join('.') : "_root";
                    if (!acc[key]) {
                        acc[key] = [];
                    }
                    if (issue.code === "unrecognized_keys") {
                        acc[key].push(`Extra fields not allowed: ${issue.keys.join(", ")}`);
                    } else {
                        acc[key].push(issue.message);
                    }

                    return acc;
                }, {} as Record<string, string[]>);
                /**Multiple errors End Here */

                return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errorMessages
                });
            } else {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
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