import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';

import { StatusCodes } from 'http-status-codes';

type RequestSource = 'body' | 'params' | 'query';

export function validateData(schema: z.ZodTypeAny, source: RequestSource) {

    return async(req: Request, res: Response, next: NextFunction) => {
        try {

            //If you ever use async validation (refine(async ...)) → schema.parse() will break so go for     schema.parseAsync()
            const sanitizedData = await schema.parseAsync(req[source]);

            //STEP 1: users can send: {} i.e empty object and .partials() schemas will allow it. We provide an optional guard.
            const isEmptyObject = (val: unknown): val is Record<string, unknown> =>
                typeof val === "object" && val !== null && !Array.isArray(val);

            if (isEmptyObject(sanitizedData) && Object.keys(sanitizedData).length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Request cannot be empty",
                });
            }

            //STEP 2: attach sanitizedData to the request i.e overwrite req.body || req.params || req.query with safe data
            /**
              TypeScript does not guarantee that req[source] is writable in a type-safe way.
                    req.params → ParamsDictionary
                    req.query → ParsedQs
                    req.body → any
            These are different types, so TS can complain or silently allow unsafe assignment. We therefore Cast properly therefore avoiding TS conflicts and Keeping flexibility.
             */
            (req as Record<RequestSource, any>)[source] = sanitizedData;

            return next();

        } catch (err) {
            if (err instanceof ZodError) {   

                    /** Option 1: Dealing with zod single error per field 
                        const errorMessages = Object.fromEntries(
                            err.issues.map((issue) => [
                                issue.path.join('.'),
                                issue.message,
                            ])
                        ); 
                    */

                    /** Option 2: Dealing with multiple errors per field  */
                        const errorMessages = err.issues.reduce((acc, issue) => {
                        
                        const key = issue.path.length ? issue.path.join('.') : "_root";

                            if (!acc[key]) {
                                acc[key] = [];
                            }

                            //acc[key].push(issue.message);
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
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
                    error: 'Internal Server Error' 
                });
            }
        }
    };
}

//validate params
export const validateRequestParams = (schema: z.ZodTypeAny): RequestHandler => {
    return validateData(schema, 'params');
};
//validate params
export const validateRequestBody = (schema: z.ZodTypeAny): RequestHandler => {
    return validateData(schema, 'body');
};
//validate params
export const validateRequestQuery = (schema: z.ZodTypeAny): RequestHandler => {
    return validateData(schema, 'query');
};