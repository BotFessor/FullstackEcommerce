import { productsTable } from '@/db/schema';
import { z } from 'zod';
//zod products schema
/**
  CREATE PRODUCT SCHEMA
 */
export const createProductSchema = z.object({
    name: z.preprocess((val) => {
        if (typeof val === "number") return String(val); //convert number to string
        return val //otherwise return string value
    }, z.string("field cannot be empty").trim().min(5).max(100)
    ),
    description: z.string("field cannot be empty").trim().min(5).max(255),
    image_url: z.string("field cannot be empty").pipe(z.url("a valid url starting with http:// is required")).optional(),
    price: z.preprocess((val) => {
        if (val === "" || val === undefined) return undefined;
        return Number(val);
    }, z.number("field cannot be empty")
        .refine((val) => Number(val), { message: "value must be an integer" })
        .nonnegative("field cannot have negative values")
        .gt(0, "value must be greater than 0")
    ),
    quantity: z.preprocess((val) => {
        if (typeof val === "string") return Number(val); //convert string to number
        return val; //otherwise just return the value
    }, z.number("field cannot be empty")
        .refine((val) => Number.isInteger(val), { message: "value must be an integer" })
        .nonnegative("value cannot be negative")
        .gt(0, "value must be greater than 0")
    ),
});
//============================================================================
//returned fields from a GET request, never expose sensitive content like id, created at, user_id etc
export const returnedProductsFieldsGET ={
            name : productsTable.name,
            description: productsTable.description,
            price: productsTable.price,
            quantity: productsTable.quantity,
            //image_url: productsTable.image
        }

//============================================================================
//CREATE
export const createProductRequestSchema = z.object({
    //for create/insert we need just body. so param and query are set to default
    body: createProductSchema.strict(),  //.strict() to enforce no extra fields
    //set defaults
    params: z.object({}).default({}),
    query: z.object({}).default({})
});

//UPDATE
export const updateProductRequestSchema = z.object({
    //for update we need both params & body. so query is set to default
    params: z.object({
        id: z.coerce.number().int().positive(),
    }).strict(),
    body: createProductSchema
        .partial()
        .refine((data) => Object.keys(data).length > 0, {
            message: "At least one field must be provided",
        })
        .strict(),
    //set default
    query: z.object({}).default({}),
});

//GET product by Id
export const getProductByIdRequestSchema = z.object({
    //To get product by Id, we need just params so body and query are set to default
    params: z.object({
        id: z.coerce.number().int().positive(),
    }).strict(),
    //set defaults
    body: z.object({}).default({}),
    query: z.object({}).default({}),
});

//DELETE product by Id
export const deleteProductByIdRequestSchema = getProductByIdRequestSchema;

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

//INFERRED TYPES-PASSED TO CONTROLLERS
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
export type GetProductByIdRequest = z.infer<typeof getProductByIdRequestSchema>;
export type DeleteProductByIdRequest = z.infer<typeof deleteProductByIdRequestSchema>;
export type GetProductRequest = z.infer<typeof getProductsRequestSchema>;