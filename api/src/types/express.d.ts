//declaration file where Express types will be defined
import "express-serve-static-core";
declare module "express-serve-static-core" {
    interface Request {
        validated?: {
            body?: unknown;
            params?: unknown;
            query?: unknown;
        };
    }
}

export { };





/**  Old
import "express";
declare global {
    namespace Express {
        interface Request {
            validated: {
                body?: unknown;
                params?: unknown;
                query?: unknown;
            };
        }
    }
}
*/