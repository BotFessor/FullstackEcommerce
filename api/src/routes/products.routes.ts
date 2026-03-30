import {Router} from 'express';
import { schema } from '@/utils/zodSchemas/products.schema';
import { productsController } from '@/controllers/products.controller';
import { validateRequest } from '@/middlewares/validate.middleware';


export const productsRouter = Router();
// GET all products
productsRouter.get('/', validateRequest(schema.getProducts, {}), productsController.getProducts); 
// CREATE product 
productsRouter.post('/', validateRequest(schema.createProduct, {}), productsController.createProduct); 
// UPDATE product
productsRouter.patch('/:id', validateRequest(schema.updateProduct, {}), productsController.updateProduct); 
// GET product by id
productsRouter.get('/:id', validateRequest(schema.getProductById, {}), productsController.getProductById);
// DELETE product by id
productsRouter.delete('/:id', validateRequest(schema.deleteProductById, {}), productsController.deleteProduct); 








