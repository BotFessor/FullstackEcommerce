import { productsTable } from '@/db/schema';
import { z } from 'zod';
/**
 * NEVER EVER FORGET .strict()  always
 */
/* ====================================================
   DRY-createUpdate general schema: use for create and Update
   ==================================================== */
const createUpdate = z.object({
    name: z.preprocess((val) => {
        if (typeof val === "number") return String(val); //convert number to string
        return val //otherwise return string value
    }, z.string("field cannot be empty").trim().min(5).max(100)
    ),
    description: z.string("field cannot be empty").trim().min(5).max(255),
    image_url: z.string("field cannot be empty").pipe(z.url("a valid url starting with http:// is required")).optional(),
    price: z.preprocess((val) => {
        if (typeof val === "string") {
            if (!/^\d+(\.\d+)?$/.test(val)) return undefined;
            return Number(val);
        }
        return val;
    },
        z.number().finite().gt(0)
    ),
    quantity: z.preprocess((val) => {
        if (typeof val === "string") return Number(val); //convert string to number
        return val; //otherwise just return the value
    }, z.number("field cannot be empty")
        .refine((val) => !Number.isNaN(val), { message: "Invalid number" })
        .nonnegative("value cannot be negative")
        .gt(0, "value must be greater than 0")
    ),
})
//1. GET ALL PRODUCTS
/**GET with Query parameters ----> customize according to query params in endpoint example 
        GET /products?page=abc&limit=-100&sort=DROP TABLE
response
        {
            "errors": {
                "page": ["Invalid input: expected number"],
                "limit": ["Number must be greater than or equal to 0"],
                "sort": ["Invalid enum value"]
            }
        }
 */
//Modify as per requirements
export const getProductsRequestSchema = z.object({
    //in Get, only query parameters required
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        search: z.string().min(1).optional(),
        sort: z.enum(["asc", "desc"]).optional(),
    }).strict(),
    //defaults
    params: z.object({}).default({}),
    body: z.object({}).default({}),
});
//2. CREATE
export const createProductRequestSchema = z.object({
    //for create/insert we need just body. so param and query are set to default
    body: createUpdate.strict(),  //.strict() to enforce no extra fields
    //set defaults
    params: z.object({}).default({}),
    query: z.object({}).default({})
});
//3. UPDATE
export const updateProductRequestSchema = z.object({
    //for update we need both params & body. so query is set to default
    params: z.object({
        id: z.coerce.number().int().positive(),
    }).strict(),
    body: createUpdate
        .partial()
        .refine((data) => Object.keys(data).length > 0, {
            message: "At least one field must be provided",
        })
        .strict(),
    //set default
    query: z.object({}).default({}),
});
//4. GET product by Id
export const getProductByIdRequestSchema = z.object({
    //To get product by Id, we need just params so body and query are set to default
    params: z.object({
        id: z.coerce.number().int().positive(),
    }).strict(),
    //set defaults
    body: z.object({}).default({}),
    query: z.object({}).default({}),
});
//5.DELETE product by Id
export const deleteProductByIdRequestSchema = getProductByIdRequestSchema;



//INFERRED TYPES-PASSED TO CONTROLLERS
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type GetProductByIdRequest = z.infer<typeof getProductByIdRequestSchema>;
export type DeleteProductByIdRequest = z.infer<typeof deleteProductByIdRequestSchema>;
export type GetProductRequest = z.infer<typeof getProductsRequestSchema>;

//============================================================================
//returned fields from a GET request, never expose sensitive content like id, created at, user_id etc. define all fields to return from a get request below-be very strict.
export const returnedProductsFieldsGET = {
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    quantity: productsTable.quantity,
    //image_url: productsTable.image
}
//============================================================================