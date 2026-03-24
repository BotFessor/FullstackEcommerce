import { Request, Response } from "express"
//List all products
export const listProductsCtrl = (req: Request, res: Response) => {
    res.send("List of products")
}
//Get products by ID
export const getProductByIdCtrl = (req: Request, res: Response) => {
    res.send(`Product with ID: ${req.params.id}`)
}
//add products
export const createProductCtrl = (req: Request, res: Response) => {
    //console.log(req.body);
    res.status(201).json({
        success: true,
        message: "Product added successfully",
        payload : req.body
    })
}
export const updateProductCtrl = (req: Request, res: Response) => {
    res.send("Authorized to update  products");
}
export const deleteProductCtrl = (req: Request, res: Response) => {
    res.send("Authorized to delete  products");
}



