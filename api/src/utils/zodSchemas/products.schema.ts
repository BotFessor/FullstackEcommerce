import { productsTable } from '@/db/schema';
import { z } from 'zod';
/**
 * NEVER EVER FORGET .strict()  always
 */

export function zodProductsSchema() {
        //A. For create and update, define uniform schem
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
        //B: get..ById and update...ById are similar define this
        const getProductById = z.object({
                //To get product by Id, we need just params so body and query are set to default
                params: z.object({
                    id: z.coerce.number().int().positive(),
                }).strict(),
                //set defaults
                body: z.object({}).default({}),
                query: z.object({}).default({}),
            });
    
// 🧹 CLEANUP: return and object defining all the schema.
    return {
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
        getProducts:  z.object({
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
        }),
        //2. CREATE
        createProduct: z.object({
            //for create/insert we need just body. so param and query are set to default
            body: createUpdate.strict(),  //.strict() to enforce no extra fields
            //set defaults
            params: z.object({}).default({}),
            query: z.object({}).default({})
        }),
        //3. UPDATE
        updateProduct: z.object({
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
        }),
        //4. GET product by Id
        getProductById,
        //5.DELETE product by Id
        deleteProductById: getProductById,
            }
    }
//1. destructure and access properties as seen below is needed all
// export const {getProducts,createProduct,updateProduct,getProductById,deleteProductById} = zodProductsSchema();
//2. OR create instance of zoProdcutsSchama to access properties for later use
export const schema = zodProductsSchema();

/* ====================================================
    INFERRED TYPES-PASSED TO CONTROLLERS   
   ==================================================== */
export type GetProductRequest = z.infer<typeof schema.getProducts>;
export type CreateProductRequest = z.infer<typeof schema.createProduct>;
export type UpdateProductRequest = z.infer<typeof schema.updateProduct>;
export type GetProductByIdRequest = z.infer<typeof schema.getProductById>;
export type DeleteProductByIdRequest = z.infer<typeof schema.deleteProductById>;
//============================================================================

//returned fields from a GET request .returning(), never expose sensitive content like id, created at, user_id etc. define all fields to return from a get request below-be very strict.
export const dotReturning = {
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    quantity: productsTable.quantity,
    //image_url: productsTable.image
}
//============================================================================