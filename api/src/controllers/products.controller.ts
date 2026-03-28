import { Request, Response } from "express";
import { productsTable } from "@/db/schema";
import { db } from "@/db";
import {  eq, lt, sql } from "drizzle-orm";
import { CreateProductRequest, DeleteProductByIdRequest, GetProductByIdRequest, GetProductRequest, returnedProductsFieldsGET, UpdateProductRequest } from "@/utils/zodSchemas/products.schema";

//create a type
type ValidatedRequest<T> = Request & {
    validated: T;
};

//List all products
export const listProductsController = async (req: Request, res: Response) => {
    //authenticate and authorize the user
    //=======================================
    //a. Destructure everything in one go NB: params and body are defaults here i.e body: z.object({}).default({})
    const { validated: { query} } = req as ValidatedRequest<GetProductRequest>;
    //b. Now access Query parameters
    const { page , limit, sort, search} = query;
    //===========================================
    try {
        //const products = await db.select().from(productsTable).orderBy(asc(productsTable.price)).limit(4);
        /**const products = await db.query.productsTable.findMany({
            where:(lte(productsTable.price, 400))
        }); */
        //query DB
        const products = await db.select(/*{
            total : sql<number>`sum(${productsTable.price})`
        }*/ returnedProductsFieldsGET).from(productsTable).where(lt(productsTable.price, 800));
        
        return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: products
       });

    } catch (error: any) {
        //1. Log Error via Pino

        //2. send generic response
        return res.status(500).json({
            success: false,
            message: "An internal server error has occured"  //Never send the error.message to clients use it for logging via Pino
        })
    }
}
//Get products by ID
export const getProductByIdController = async (req: Request, res: Response) => {
    //Authenticate user and do Authorization

    //=======================================
    //a. Destructure everything in one go NB: body and query are defaults here i.e body: z.object({}).default({})
    const { validated: { params } } = req as ValidatedRequest<GetProductByIdRequest>;
    //b. Now access Query parameters
    const { id } = params;
    //===========================================

        try {
            const product = await db.select(returnedProductsFieldsGET).from(productsTable).where(eq(productsTable.id, id));
            if(product === undefined || product.length == 0){
                return res.status(404).json({
                    success: false,
                    message: 'Product not found',
                })
            }

            return res.status(200).json({
             success: true,
             message: "product retrieved successfully",
             data: product  
            })
        } catch (error:any) {
            //1. Log Error via Pino

            //2. send generic response
            return res.status(500).json({
                success: false,
                message: "An internal server error has occured"  //Never send the error.message to clients use it for logging via Pino
            })
        }
}
//CREATE PRODUCTS
export const createProductController = async (req: Request, res: Response) => {
    //=======================================
    //a. Destructure everything in one go NB: params and query are defaults here i.e query: z.object({}).default({})
    const { validated: { body } } = req as ValidatedRequest<CreateProductRequest>;
    //b. Now access Query parameters
    const product = body;
    //===========================================
        try {
            const [insertedProduct] = await db.insert(productsTable).values(product).returning({
                name: productsTable.name,
                description: productsTable.description,
                image_url: productsTable.image,
                price: productsTable.price,
                quantity: productsTable.quantity
            });

            return res.status(201).json({
                success: true,
                message: "product created successfully",
                data: insertedProduct
            });
            
        } catch (error: any) {
            //1. Log Error via Pino

            //2. send generic response
            return res.status(500).json({
                success: false,
                message: "An internal server error has occured"  //Never send the error.message to clients use it for logging via Pino
            })
        }
        
}

export const updateProductController = async(req: Request, res: Response) => {
    //=======================================
    //a. Destructure everything in one go NB: params and query are defaults here i.e query: z.object({}).default({})
    const { validated: { params, body } } = req as ValidatedRequest<UpdateProductRequest>;
    //b. Now access Query parameters
    const { id } = params;  //destructure
    const updatedFields = body; //re-assign
    //===========================================

    try {
        //only return defined fields.
        const [updatedProduct] = await db.update(productsTable).set(updatedFields).where(eq(productsTable.id, id)).returning({
            name: productsTable.name,
            description: productsTable.description,
            image_url: productsTable.image,
            price: productsTable.price,
            quantity: productsTable.quantity
        });

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product was not found"
            })
        }
        return res.status(201).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct
        })
    } catch (error: any) {
        //1. Log Error via Pino

        //2. send generic response
        return res.status(500).json({
            success: false,
            message: "An internal server error has occured"  //Never send the error.message to clients use it for logging via Pino
        })
    }
    
}

export const deleteProductController = async (req: Request, res: Response) => {
    //=======================================
    //a. Destructure everything in one go NB: params and query are defaults here i.e query: z.object({}).default({})
    const { validated: { params, body } } = req as ValidatedRequest<DeleteProductByIdRequest>;
    //b. Now access Query parameters
    const { id } = params;  //destructure
    //===========================================
       
       try {
           const [deletedProduct] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning({
               name: productsTable.name,
               description: productsTable.description,
               image_url: productsTable.image,
               price: productsTable.price,
               quantity: productsTable.quantity
           });

           if (!deletedProduct) {
               return res.status(404).json({
                   success: false,
                   message: "Unable to delete product"
               })
           }
           return res.status(201).json({
               success: true,
               message: "Product deleted successfully",
               data: deletedProduct
           })
       } catch (error: any) {
           //1. Log Error via Pino

           //2. send generic response
           return res.status(500).json({
               success: false,
               message: "An internal server error has occured"  //Never send the error.message to clients use it for logging via Pino
           })
       }
}



