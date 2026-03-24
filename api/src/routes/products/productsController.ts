import { Request, Response } from "express";
import { productsTable } from "@/db/schema";
import { z } from "zod";
import { db } from "@/db";


//List all products
export const listProductsCtrl = (req: Request, res: Response) => {
    res.send("List of products")
}
//Get products by ID
export const getProductByIdCtrl = (req: Request, res: Response) => {
    res.send(`Product with ID: ${req.params.id}`)
}
//add products
export const createProductCtrl = async (req: Request, res: Response) => {
        //never trust user input..do validation
        const zodProductSchema = z.object({
            name : z.string().max(255, 'Name cannot exceed 255 characters').min(5, "Name should be at least 5 characters long").optional(),
            description: z.string().optional(),
            image_url: z.string().optional(),
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
        const results = zodProductSchema.safeParse(req.body); //does not throw exceptions

        //If validation fails & errors exist
        if(!results.success){
            const errors = results.error.flatten();
            console.log(errors.fieldErrors);
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
export const updateProductCtrl = (req: Request, res: Response) => {
    res.send("Authorized to update  products");
}
export const deleteProductCtrl = (req: Request, res: Response) => {
    res.send("Authorized to delete  products");
}



