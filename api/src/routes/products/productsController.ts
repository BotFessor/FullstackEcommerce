import { Request, Response } from "express";
import { productsTable } from "@/db/schema";
import { success, z } from "zod";
import { db } from "@/db";
import { asc, eq, gt, gte, lt, lte, sql, sum } from "drizzle-orm";


//List all products
export const listProductsCtrl = async (req: Request, res: Response) => {
    //authenticate and authorize the user
    try {
        //const products = await db.select().from(productsTable).orderBy(asc(productsTable.price)).limit(4);
        /**const products = await db.query.productsTable.findMany({
            where:(lte(productsTable.price, 400))
        }); */
        //compute sum
        const products = await db.select({
            total : sql<number>`sum(${productsTable.price})`
        }).from(productsTable).where(lt(productsTable.price, 500));
        
        return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: products
       });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "Couldn't fetch products"
        });
    }
}
//Get products by ID
export const getProductByIdCtrl = async (req: Request, res: Response) => {
    //Authenticate user and do Authorization
    //Perform zod validation

        try {
            const product = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id));
            if(product === undefined || product.length == 0){
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                })
            }

            return res.status(200).json({
             success: true,
             message: "retrieved product with id",
             data: product  
            })
        } catch (error:any) {
        return res.status(500).json({
            success: false,
            message: error.message
        }) 
        }
}
//add products
export const createProductCtrl = async (req: Request, res: Response) => {
        //never trust user input..do validation
        const zodProductSchema = z.object({
            name : z.string().max(255, 'Name cannot exceed 255 characters').min(5, "Name should be at least 5 characters long"),
            description: z.string().optional(),
            image_url: z.string().url().optional(),
            price: z.number("enter a valid value for price").gte(0),
            quantity: z.number().int().gte(0, "Quantity must be >= 0"),
        });

        //validate the req.body 
        /**
                // on success, returns
                        {
                            success: true,
                            data: ...
                        }
                //on Error, returns
                        {
                            success: false,
                            error: ZodError
                        }

         */
        const results = zodProductSchema.safeParse(await req.body); //does not throw exceptions

        //If validation fails & errors exist
        if(!results.success){
            const errors = results.error.flatten();
            return res.status(400).json({
                success : false,
                message: "Validation failed",
                errors: errors.fieldErrors
            });
        }

        try {
            //create product
            const [insertedProduct] = await db.insert(productsTable).values(results.data).returning();

            return res.status(201).json({
                success: true,
                message: "product created successfully",
                data: insertedProduct
            });
            
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: "error.message"
            });
        }
        
}
export const updateProductCtrl = async(req: Request, res: Response) => {
    const id = Number(req.params.id);
    const updatedFields = req.body;
    console.log(updatedFields);
    try {
        const [updateProds] = await db.update(productsTable).set(updatedFields).where(eq(productsTable.id, id)).returning();
        if (!updateProds) {
            return res.status(404).json({
                success: false,
                message: "Product was not found"
            })
        }
        return res.status(201).json({
            success: true,
            message: "Product updated successfully",
            data: updateProds
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
    
}


export const deleteProductCtrl = async (req: Request, res: Response) => {
       const {id} = req.params;
       try {
           const [deleteProd] = await db.delete(productsTable).where(eq(productsTable.id, Number(id))).returning();

           if (!deleteProd) {
               return res.status(404).json({
                   success: false,
                   message: "Unable to delete product"
               })
           }
           return res.status(201).json({
               success: true,
               message: "Product deleted successfully",
               data: deleteProd
           })
       } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message
            })
       }
}



